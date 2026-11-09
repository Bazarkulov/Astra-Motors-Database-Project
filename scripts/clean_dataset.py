"""Inspect and clean the supported Kaggle CSV into a separate processed file."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from import_kaggle import DEFAULT_OUTPUT, clean_dataset


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv", type=Path, help="Path to the untouched downloaded vehicles.csv")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--limit", type=int, help="Limit the processed output for a small pilot")
    args = parser.parse_args()
    if args.limit is not None and args.limit < 1:
        parser.error("--limit must be positive")
    try:
        records = clean_dataset(args.csv.expanduser().resolve(), args.output.resolve(), args.limit)
        print(f"Processed output: {args.output.resolve()} ({len(records):,} rows)")
    except Exception as exc:
        print(f"Dataset cleaning failed: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
