"""Clean a Kaggle Craigslist vehicle CSV and optionally import safe drafts to Supabase."""

from __future__ import annotations

import argparse
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
DATASET = "kaggle:austinreese/craigslist-carstrucks-data"
DEFAULT_OUTPUT = ROOT / "data" / "processed" / "vehicles_clean.csv"

MAKE_ALIASES = {
    "chevy": "chevrolet",
    "vw": "volkswagen",
    "mercedes": "mercedes-benz",
    "mb": "mercedes-benz",
    "ram trucks": "ram",
}
CANONICAL_MAKES = {
    "bmw": "BMW",
    "gmc": "GMC",
    "mini": "MINI",
    "ram": "Ram",
    "mercedes-benz": "Mercedes-Benz",
    "land rover": "Land Rover",
    "alfa romeo": "Alfa Romeo",
}
FUEL_ALIASES = {
    "gas": "gasoline",
    "petrol": "gasoline",
    "electric": "electric",
    "hybrid": "hybrid",
    "diesel": "diesel",
}
TRANSMISSION_ALIASES = {
    "auto": "automatic",
    "automatic": "automatic",
    "manual": "manual",
    "other": "other",
}


def clean_text(value: Any) -> str | None:
    if pd.isna(value):
        return None
    text = re.sub(r"\s+", " ", str(value)).strip()
    return text or None


def normalized_name(value: str) -> str:
    return re.sub(r"\s+", " ", value.casefold()).strip()


def number_column(series: pd.Series) -> pd.Series:
    return pd.to_numeric(
        series.astype("string").str.replace(r"[$,\s]", "", regex=True),
        errors="coerce",
    )


def find_column(frame: pd.DataFrame, *names: str) -> str | None:
    columns = {str(column).casefold(): str(column) for column in frame.columns}
    return next((columns[name.casefold()] for name in names if name.casefold() in columns), None)


def clean_dataset(source: Path, output: Path, limit: int | None = None) -> pd.DataFrame:
    if not source.is_file():
        raise FileNotFoundError(f"CSV not found: {source}")

    # Inspect headers first, then load only mapped columns (excluding long descriptions and URLs).
    headers = pd.read_csv(source, nrows=0).columns
    header_frame = pd.DataFrame(columns=headers)
    year_col = find_column(header_frame, "year")
    make_col = find_column(header_frame, "manufacturer", "make")
    model_col = find_column(header_frame, "model")
    record_col = find_column(header_frame, "id", "original_record_id")
    if not all((year_col, make_col, model_col, record_col)):
        raise ValueError(
            "CSV must contain year, manufacturer/make, model, and id/original_record_id columns. "
            f"Found: {', '.join(map(str, headers))}"
        )

    price_col = find_column(header_frame, "price", "asking_price")
    mileage_col = find_column(header_frame, "odometer", "mileage")
    transmission_col = find_column(header_frame, "transmission", "trans")
    fuel_col = find_column(header_frame, "fuel", "fuel_type")
    body_col = find_column(header_frame, "type", "body_style")
    engine_col = find_column(header_frame, "cylinders", "engine")
    exterior_col = find_column(header_frame, "paint_color", "exterior_color", "color")
    interior_col = find_column(header_frame, "interior_color", "int_color")
    vin_col = find_column(header_frame, "vin")
    use_columns = {
        column
        for column in (
            year_col, make_col, model_col, record_col, price_col, mileage_col,
            transmission_col, fuel_col, body_col, engine_col, exterior_col,
            interior_col, vin_col,
        )
        if column
    }
    frame = pd.read_csv(source, usecols=use_columns, low_memory=False)
    source_rows = len(frame)
    missing_make_model = frame[make_col].isna() | frame[model_col].isna() | frame[record_col].isna()
    parsed_year = number_column(frame[year_col]).round()

    now = datetime.now(timezone.utc).isoformat()
    year = parsed_year
    max_year = datetime.now(timezone.utc).year + 1
    valid = year.between(1886, max_year)
    valid &= frame[make_col].notna() & frame[model_col].notna() & frame[record_col].notna()
    invalid_year_count = int((~year.between(1886, max_year)).sum())
    frame = frame.loc[valid].copy()
    year = year.loc[valid].astype("int64")

    records = pd.DataFrame(index=frame.index)
    records["source_dataset"] = DATASET
    records["original_record_id"] = frame[record_col].astype("string").str.strip()
    records["imported_at"] = now
    records["make_name"] = frame[make_col].map(clean_text)
    records["make_normalized_name"] = records["make_name"].map(
        lambda name: normalized_name(name) if name else None
    )
    records["make_normalized_name"] = records["make_normalized_name"].replace(MAKE_ALIASES)
    records["make_name"] = records["make_normalized_name"].map(
        lambda name: CANONICAL_MAKES.get(name, name.title()) if name else None
    )
    records["model_name"] = frame[model_col].map(clean_text)
    records["model_normalized_name"] = records["model_name"].map(
        lambda name: normalized_name(name) if name else None
    )
    records["model_year"] = year
    records["asking_price"] = number_column(frame[price_col]) if price_col else np.nan
    records["mileage"] = number_column(frame[mileage_col]).round() if mileage_col else np.nan
    records["transmission"] = frame[transmission_col].map(clean_text).str.casefold() if transmission_col else None
    if transmission_col:
        records["transmission"] = records["transmission"].replace(TRANSMISSION_ALIASES)
    records["fuel_type"] = frame[fuel_col].map(clean_text).str.casefold() if fuel_col else None
    if fuel_col:
        records["fuel_type"] = records["fuel_type"].replace(FUEL_ALIASES)
    records["body_style"] = frame[body_col].map(clean_text).str.casefold() if body_col else None
    records["engine"] = frame[engine_col].map(clean_text) if engine_col else None
    records["exterior_color"] = frame[exterior_col].map(clean_text) if exterior_col else None
    records["interior_color"] = frame[interior_col].map(clean_text) if interior_col else None
    records["vin"] = frame[vin_col].map(clean_text).str.upper() if vin_col else None

    records["asking_price"] = pd.to_numeric(records["asking_price"], errors="coerce")
    records.loc[records["asking_price"] < 0, "asking_price"] = np.nan
    records["mileage"] = pd.to_numeric(records["mileage"], errors="coerce")
    records.loc[records["mileage"] < 0, "mileage"] = np.nan
    records["vin"] = records["vin"].where(records["vin"].str.len() == 17)
    records = records.dropna(subset=["source_dataset", "original_record_id", "make_name", "model_name"])
    before_deduplication = len(records)
    records = records.drop_duplicates(subset=["source_dataset", "original_record_id"], keep="first")
    duplicate_count = before_deduplication - len(records)
    duplicate_vin_mask = records["vin"].notna() & records.duplicated(subset=["vin"], keep="first")
    duplicate_vin_count = int(duplicate_vin_mask.sum())
    records = records.loc[~duplicate_vin_mask]
    missing_price_count = int(records["asking_price"].isna().sum())
    missing_mileage_count = int(records["mileage"].isna().sum())
    print(f"Source rows: {source_rows:,}")
    print(f"Rows with missing make/model/record ID: {int(missing_make_model.sum()):,}")
    print(f"Rows with invalid year: {invalid_year_count:,}")
    print(f"Duplicate source record IDs removed: {duplicate_count:,}")
    print(f"Duplicate VIN records removed: {duplicate_vin_count:,}")
    print(f"Retained rows with missing price: {missing_price_count:,}")
    print(f"Retained rows with missing mileage: {missing_mileage_count:,}")
    if limit is not None:
        records = records.head(limit)

    output.parent.mkdir(parents=True, exist_ok=True)
    records.to_csv(output, index=False)
    return records


def batched(items: list[dict[str, Any]], size: int = 500):
    for start in range(0, len(items), size):
        yield items[start : start + size]


def import_drafts(records: pd.DataFrame) -> int:
    load_dotenv(ROOT / ".env.local")
    import os

    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not service_key:
        raise RuntimeError(
            "Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY "
            "in .env.local before importing. The service-role key bypasses RLS and stays local."
        )

    from supabase import create_client

    client = create_client(url, service_key)
    makes = (
        records[["make_name", "make_normalized_name"]]
        .drop_duplicates()
        .rename(columns={"make_name": "name", "make_normalized_name": "normalized_name"})
        .to_dict("records")
    )
    make_ids: dict[str, str] = {}
    for batch in batched(makes):
        for row in client.table("make").upsert(batch, on_conflict="normalized_name").execute().data:
            make_ids[row["normalized_name"]] = row["id"]

    models = records[["make_normalized_name", "model_name", "model_normalized_name"]]
    models = models.drop_duplicates(
        subset=["make_normalized_name", "model_normalized_name"], keep="first"
    )
    models = models.assign(make_id=models["make_normalized_name"].map(make_ids))
    models = models.dropna(subset=["make_id"])
    model_ids: dict[tuple[str, str], str] = {}
    model_payload = models.rename(
        columns={"model_name": "name", "model_normalized_name": "normalized_name"}
    )[["make_id", "name", "normalized_name"]].to_dict("records")
    for batch in batched(model_payload):
        for row in client.table("model").upsert(
            batch, on_conflict="make_id,normalized_name"
        ).execute().data:
            model_ids[(row["make_id"], row["normalized_name"])] = row["id"]

    vehicles: list[dict[str, Any]] = []

    def optional(row: dict[str, Any], key: str) -> Any:
        value = row[key]
        return None if pd.isna(value) else value

    for row in records.to_dict("records"):
        make_id = make_ids.get(row["make_normalized_name"])
        model_id = model_ids.get((make_id, row["model_normalized_name"])) if make_id else None
        if not make_id or not model_id:
            continue
        vehicles.append(
            {
                "make_id": make_id,
                "model_id": model_id,
                "model_year": int(row["model_year"]),
                "asking_price": optional(row, "asking_price"),
                "currency": "USD",
                "mileage": int(row["mileage"]) if pd.notna(row["mileage"]) else None,
                "mileage_unit": "mi",
                "transmission": optional(row, "transmission"),
                "fuel_type": optional(row, "fuel_type"),
                "body_style": optional(row, "body_style"),
                "engine": optional(row, "engine"),
                "exterior_color": optional(row, "exterior_color"),
                "interior_color": optional(row, "interior_color"),
                "vin": optional(row, "vin"),
                "public_vin": False,
                "status": "draft",
                "published_at": None,
                "source_dataset": row["source_dataset"],
                "original_record_id": row["original_record_id"],
                "imported_at": row["imported_at"],
            }
        )

    imported = 0
    for batch in batched(vehicles):
        response = client.table("vehicle").upsert(
            batch, on_conflict="source_dataset,original_record_id"
        ).execute()
        imported += len(response.data or [])
    return imported


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv", type=Path, help="Path to the downloaded Kaggle vehicles.csv")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--limit", type=int, help="Limit cleaned/imported rows for a small pilot")
    parser.add_argument(
        "--import-to-supabase",
        action="store_true",
        help="Import records as unpublished drafts using the local service-role key",
    )
    args = parser.parse_args()
    if args.limit is not None and args.limit < 1:
        parser.error("--limit must be positive")

    try:
        records = clean_dataset(args.csv.expanduser().resolve(), args.output.resolve(), args.limit)
        print(f"Cleaned {len(records):,} records -> {args.output.resolve()}")
        print("Rows are candidates for staff review; no imported record is published or shown as available.")
        if args.import_to_supabase:
            print(f"Imported {import_drafts(records):,} records as draft vehicles.")
    except Exception as exc:  # CLI boundary: concise, actionable failure for operators.
        print(f"Import pipeline failed: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
