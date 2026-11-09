"""Seed fictional, linked CRM and transaction examples without fake photos or staff."""

from __future__ import annotations

import os
import sys
from datetime import date

from dotenv import load_dotenv
from postgrest.exceptions import APIError
from supabase import create_client

CUSTOMERS = [
    {"first_name": "Alex", "last_name": "Morgan", "email": "alex.morgan@example.invalid", "phone": "+1-555-0101"},
    {"first_name": "Jordan", "last_name": "Lee", "email": "jordan.lee@example.invalid", "phone": "+1-555-0102"},
    {"first_name": "Taylor", "last_name": "Reed", "email": "taylor.reed@example.invalid", "phone": "+1-555-0103"},
]

VEHICLES = [
    {
        "key": "mustang-1965",
        "year": 1965,
        "make": "Ford",
        "model": "Mustang",
        "category": "Muscle Cars",
        "price": 68500,
        "mileage": 62400,
        "status": "available",
        "body_style": "Coupe",
        "transmission": "manual",
        "fuel_type": "gasoline",
        "engine": "V8",
        "exterior_color": "Dark blue",
        "interior_color": "Black",
        "description": "DEMONSTRATION RECORD — fictional inventory example for admin workflow previews. Not an actual vehicle offered for sale.",
    },
    {
        "key": "porsche-1970",
        "year": 1970,
        "make": "Porsche",
        "model": "911",
        "category": "Sports Cars",
        "price": 142000,
        "mileage": 48100,
        "status": "sold",
        "body_style": "Coupe",
        "transmission": "manual",
        "fuel_type": "gasoline",
        "engine": "Flat-six",
        "exterior_color": "Silver",
        "interior_color": "Black",
        "description": "DEMONSTRATION RECORD — fictional transaction example for admin workflow previews. Not an actual vehicle offered for sale.",
    },
    {
        "key": "camaro-1969",
        "year": 1969,
        "make": "Chevrolet",
        "model": "Camaro",
        "category": "Muscle Cars",
        "price": 79500,
        "mileage": 53700,
        "status": "reserved",
        "body_style": "Coupe",
        "transmission": "automatic",
        "fuel_type": "gasoline",
        "engine": "V8",
        "exterior_color": "Red",
        "interior_color": "Black",
        "description": "DEMONSTRATION RECORD — fictional pending-sale example for admin workflow previews. Not an actual vehicle offered for sale.",
    },
]


def first_row(response):
    return response.data[0] if response.data else None


def ensure_customer(client, fixture: dict) -> str:
    email = fixture["email"]
    normalized = email.lower()
    existing = first_row(
        client.table("customer")
        .select("id,is_demo")
        .eq("email_normalized", normalized)
        .limit(1)
        .execute()
    )
    if existing:
        if not existing["is_demo"]:
            raise RuntimeError(f"Refusing to reuse a non-demo customer record for {email}.")
        client.table("customer").update({**fixture, "email_normalized": normalized, "is_demo": True}).eq("id", existing["id"]).execute()
        return existing["id"]

    created = client.table("customer").insert({
        **fixture,
        "email_normalized": normalized,
        "is_demo": True,
    }).execute()
    return first_row(created)["id"]


def ensure_make_model(client, make_name: str, model_name: str, category: str) -> tuple[str, str]:
    normalized_make = make_name.casefold()
    client.table("make").upsert({
        "name": make_name,
        "normalized_name": normalized_make,
    }, on_conflict="normalized_name", ignore_duplicates=True).execute()
    make = first_row(
        client.table("make").select("id").eq("normalized_name", normalized_make).limit(1).execute()
    )
    normalized_model = model_name.casefold()
    client.table("model").upsert({
        "make_id": make["id"],
        "name": model_name,
        "normalized_name": normalized_model,
        "category": category,
    }, on_conflict="make_id,normalized_name", ignore_duplicates=True).execute()
    model = first_row(
        client.table("model")
        .select("id")
        .eq("make_id", make["id"])
        .eq("normalized_name", normalized_model)
        .limit(1)
        .execute()
    )
    return make["id"], model["id"]


def ensure_vehicle(client, fixture: dict) -> str:
    make_id, model_id = ensure_make_model(
        client, fixture["make"], fixture["model"], fixture["category"]
    )
    lookup = (
        client.table("vehicle")
        .select("id,is_demo")
        .eq("make_id", make_id)
        .eq("model_id", model_id)
        .eq("model_year", fixture["year"])
        .eq("is_demo", True)
        .limit(1)
        .execute()
    )
    existing = first_row(lookup)
    vehicle = {
        "make_id": make_id,
        "model_id": model_id,
        "model_year": fixture["year"],
        "asking_price": fixture["price"],
        "mileage": fixture["mileage"],
        "mileage_unit": "mi",
        "currency": "USD",
        "status": fixture["status"],
        "category": fixture["category"],
        "body_style": fixture["body_style"],
        "transmission": fixture["transmission"],
        "fuel_type": fixture["fuel_type"],
        "engine": fixture["engine"],
        "exterior_color": fixture["exterior_color"],
        "interior_color": fixture["interior_color"],
        "description": fixture["description"],
        "published_at": None,
        "public_vin": False,
        "is_demo": True,
    }
    if existing:
        client.table("vehicle").update(vehicle).eq("id", existing["id"]).execute()
        return existing["id"]
    return first_row(client.table("vehicle").insert(vehicle).execute())["id"]


def ensure_linked_record(client, table: str, lookup: dict, values: dict) -> str:
    query = client.table(table).select("id").eq("is_demo", True)
    for key, value in lookup.items():
        query = query.eq(key, value)
    existing = first_row(query.limit(1).execute())
    if existing:
        client.table(table).update(values).eq("id", existing["id"]).execute()
        return existing["id"]
    inserted = client.table(table).insert({**lookup, **values, "is_demo": True}).execute()
    return first_row(inserted)["id"]


def ensure_named_demo_lookup(client, table: str, name: str, email: str) -> str:
    existing = first_row(
        client.table(table).select("id,is_demo").eq("name", name).limit(1).execute()
    )
    if existing:
        if not existing["is_demo"]:
            raise RuntimeError(f"Refusing to reuse a non-demo {table} record named {name!r}.")
        return existing["id"]
    inserted = client.table(table).insert({
        "name": name,
        "contact_email": email,
        "is_demo": True,
    }).execute()
    return first_row(inserted)["id"]


def seed(client) -> None:
    customer_ids = {row["email"]: ensure_customer(client, row) for row in CUSTOMERS}
    vehicle_ids = {row["key"]: ensure_vehicle(client, row) for row in VEHICLES}

    inquiries = [
        ("alex.morgan@example.invalid", "Inventory question", "Could you share the service history for the Mustang?", "new", "mustang-1965"),
        ("jordan.lee@example.invalid", "Completed purchase follow-up", "Please send the delivery checklist for the 911.", "completed", "porsche-1970"),
        ("taylor.reed@example.invalid", "Camaro availability", "I would like to confirm the next steps for the reserved Camaro.", "in_progress", "camaro-1969"),
    ]
    legacy_subjects = {
        "jordan.lee@example.invalid": "Trade-in estimate",
        "taylor.reed@example.invalid": "Financing options",
    }
    for email, subject, message, status, vehicle_key in inquiries:
        legacy_subject = legacy_subjects.get(email)
        if legacy_subject:
            legacy = first_row(
                client.table("inquiry")
                .select("id")
                .eq("customer_id", customer_ids[email])
                .eq("subject", legacy_subject)
                .eq("is_demo", True)
                .limit(1)
                .execute()
            )
            if legacy:
                client.table("inquiry").update({
                    "subject": subject,
                    "vehicle_id": vehicle_ids[vehicle_key],
                    "message": message,
                    "status": status,
                }).eq("id", legacy["id"]).execute()
                continue
        ensure_linked_record(
            client,
            "inquiry",
            {"customer_id": customer_ids[email], "subject": subject},
            {
                "vehicle_id": vehicle_ids[vehicle_key],
                "message": message,
                "status": status,
            },
        )

    ensure_linked_record(
        client,
        "test_drive",
        {"customer_id": customer_ids["taylor.reed@example.invalid"], "vehicle_id": vehicle_ids["mustang-1965"]},
        {
            "requested_at": "2026-10-24T09:00:00Z",
            "scheduled_at": "2026-11-05T16:00:00Z",
            "status": "scheduled",
            "notes": "DEMO: scheduled visit; fictional customer and vehicle.",
        },
    )

    for vehicle_key, result, notes in [
        ("mustang-1965", "passed_with_notes", "DEMO: example inspection record; no real inspection was performed."),
        ("porsche-1970", "passed", "DEMO: example inspection record; no real inspection was performed."),
        ("camaro-1969", "pending", "DEMO: example inspection record; no real inspection was performed."),
    ]:
        ensure_linked_record(
            client,
            "inspection",
            {"vehicle_id": vehicle_ids[vehicle_key], "notes": notes},
            {"inspection_date": date.today().isoformat(), "result": result},
        )

    ensure_linked_record(
        client,
        "consignment",
        {"vehicle_id": vehicle_ids["mustang-1965"], "seller_customer_id": customer_ids["alex.morgan@example.invalid"]},
        {
            "agreement_date": "2026-10-20",
            "asking_price": 68500,
            "currency": "USD",
            "commission_rate": 8.5,
            "status": "active",
            "notes": "DEMO: fictional consignment agreement for workflow preview.",
        },
    )

    completed_sale_id = ensure_linked_record(
        client,
        "sale",
        {"vehicle_id": vehicle_ids["porsche-1970"], "buyer_customer_id": customer_ids["jordan.lee@example.invalid"]},
        {
            "sale_date": "2026-10-18T15:00:00Z",
            "sale_price": 142000,
            "currency": "USD",
            "status": "completed",
            "notes": "DEMO: fictional completed transaction for workflow preview.",
        },
    )
    pending_sale_id = ensure_linked_record(
        client,
        "sale",
        {"vehicle_id": vehicle_ids["camaro-1969"], "buyer_customer_id": customer_ids["taylor.reed@example.invalid"]},
        {
            "sale_date": None,
            "sale_price": 79500,
            "currency": "USD",
            "status": "pending",
            "notes": "DEMO: fictional pending transaction for workflow preview.",
        },
    )

    for sale_id, reference, amount, status, paid_at in [
        (completed_sale_id, "DEMO-PAYMENT-911-001", 142000, "paid", "2026-10-18T15:05:00Z"),
        (pending_sale_id, "DEMO-PAYMENT-CAMARO-001", 5000, "pending", None),
    ]:
        existing = first_row(
            client.table("payment").select("id").eq("external_reference", reference).eq("is_demo", True).limit(1).execute()
        )
        payload = {
            "sale_id": sale_id,
            "amount": amount,
            "currency": "USD",
            "payment_method": "bank transfer",
            "status": status,
            "paid_at": paid_at,
            "external_reference": reference,
            "is_demo": True,
        }
        if existing:
            client.table("payment").update(payload).eq("id", existing["id"]).execute()
        else:
            client.table("payment").insert(payload).execute()

    lender_id = ensure_named_demo_lookup(client, "lender", "DEMO — Heritage Finance", "finance@example.invalid")
    carrier_id = ensure_named_demo_lookup(client, "carrier", "DEMO — Classic Auto Transport", "dispatch@example.invalid")
    client.table("finance_application").upsert({
        "customer_id": customer_ids["jordan.lee@example.invalid"],
        "sale_id": completed_sale_id,
        "lender_id": lender_id,
        "status": "approved",
        "requested_amount": 50000,
        "currency": "USD",
        "private_document_path": None,
        "is_demo": True,
    }, on_conflict="sale_id").execute()
    client.table("shipment").upsert({
        "sale_id": completed_sale_id,
        "carrier_id": carrier_id,
        "status": "delivered",
        "scheduled_pickup_at": "2026-10-20T09:00:00Z",
        "delivered_at": "2026-10-21T15:00:00Z",
        "tracking_reference": "DEMO-SHIP-911-001",
        "pickup_address": "DEMO — fictional pickup location",
        "delivery_address": "DEMO — fictional delivery location",
        "is_demo": True,
    }, on_conflict="sale_id").execute()
    client.table("favorite").upsert({
        "customer_id": customer_ids["alex.morgan@example.invalid"],
        "vehicle_id": vehicle_ids["porsche-1970"],
        "is_demo": True,
    }, on_conflict="customer_id,vehicle_id").execute()


def main() -> int:
    load_dotenv(".env.local")
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.", file=sys.stderr)
        return 2

    try:
        seed(create_client(url, key))
    except APIError as error:
        if error.code in {"PGRST200", "PGRST204", "PGRST205"}:
            print(
                "Supabase is missing a required table or the demo-data migration. "
                "Apply all SQL files in supabase/migrations/ in filename order, then rerun this seed.",
                file=sys.stderr,
            )
        else:
            print(f"Supabase request failed ({error.code}): {error.message}", file=sys.stderr)
        return 1
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        return 1

    print("Demo seed complete (safe to rerun):")
    print("  3 fictional customers, vehicles, inquiries, and inspections")
    print("  1 scheduled test drive, 1 active consignment, 2 sales and payments")
    print("  1 finance application, 1 shipment, and 1 saved vehicle")
    print("All demo entities are marked and demo vehicles remain hidden from the public catalog.")
    print("No vehicle photos, real staff, or real customer data were created.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
