from fastapi import APIRouter, Query
from sqlalchemy import text
from db.database import engine
from collections import defaultdict

router = APIRouter(prefix="/optimizer", tags=["Optimizer"])

ALLOWED_AISLES = ["P", "Q", "R", "S", "T"]


# -----------------------------
# FILTER OPTIONS
# -----------------------------
@router.get("/filters")
def get_filters():
    with engine.connect() as conn:
        categories = conn.execute(
            text("""
                SELECT DISTINCT category
                FROM products
                WHERE category IS NOT NULL
                ORDER BY category
            """)
        ).scalars().all()

        brands = conn.execute(
            text("""
                SELECT DISTINCT brand
                FROM products
                WHERE brand IS NOT NULL
                ORDER BY brand
            """)
        ).scalars().all()

    return {
        "categories": categories,
        "brands": brands,
    }


# -----------------------------
# GET LOCATIONS
# -----------------------------
@router.get("/locations")
def get_locations(
    aisle: str | None = Query(None),
    category: str | None = Query(None),
    brand: str | None = Query(None),
    search: str | None = Query(None),
):
    base_query = """
        SELECT
            UPPER(ls.location_code) AS location_code,
            LEFT(split_part(ls.location_code, '-', 1), 1) AS aisle,
            split_part(ls.location_code, '-', 2) AS rack_type,
            ls.sku,
            p.product_name,
            p.brand,
            p.category,
            FLOOR(ls.units::float / p.units_per_carton) AS cartons,
            COALESCE(
                lc.max_cartons,     -- manual override
                prc.max_cartons,    -- product + rack rule
                42                  -- default
            ) AS max_cartons
        FROM location_stock ls
        JOIN products p ON p.sku = ls.sku
        LEFT JOIN location_capacity lc
            ON UPPER(lc.location_code) = UPPER(ls.location_code)
        LEFT JOIN product_rack_capacity prc
            ON prc.sku = ls.sku
           AND prc.rack_type = split_part(ls.location_code, '-', 2)
        WHERE LEFT(split_part(ls.location_code, '-', 1), 1)
              IN ('P','Q','R','S','T')
    """

    params = {}

    if aisle:
        base_query += " AND LEFT(split_part(ls.location_code, '-', 1), 1) = :aisle"
        params["aisle"] = aisle

    if category:
        base_query += " AND p.category ILIKE :category"
        params["category"] = f"%{category}%"

    if brand:
        base_query += " AND p.brand ILIKE :brand"
        params["brand"] = f"%{brand}%"

    if search:
        base_query += " AND (ls.sku ILIKE :search OR p.product_name ILIKE :search)"
        params["search"] = f"%{search}%"

    base_query += """
        AND (ls.units::float / p.units_per_carton) > 0
        ORDER BY location_code
    """

    with engine.connect() as conn:
        rows = conn.execute(text(base_query), params).mappings().all()

        sku_check = conn.execute(text("""
            SELECT location_code, COUNT(DISTINCT sku) as sku_count
            FROM location_stock
            GROUP BY location_code
        """)).mappings().all()

    sku_map = {
        row["location_code"].upper(): row["sku_count"]
        for row in sku_check
    }

    grouped = defaultdict(list)

    for row in rows:
        grouped[row["location_code"]].append(row)

    result = []

    for location_code, items in grouped.items():

        total_cartons = sum(int(i["cartons"] or 0) for i in items)
        capacity = int(items[0]["max_cartons"] or 42)

        occupancy_percent = (
            round((total_cartons / capacity) * 100, 1)
            if capacity > 0
            else 0
        )

        real_sku_count = sku_map.get(location_code.upper(), 0)
        is_mixed = real_sku_count > 1
        needs_merge = occupancy_percent < 60

        result.append({
            "location_code": location_code,
            "aisle": items[0]["aisle"],
            "rack_type": items[0]["rack_type"],
            "total_cartons": total_cartons,
            "max_cartons": capacity,
            "occupancy_percent": occupancy_percent,
            "is_mixed": is_mixed,
            "needs_merge": needs_merge,
            "items": [
                {
                    "sku": i["sku"],
                    "product_name": i["product_name"],
                    "cartons": int(i["cartons"] or 0),
                }
                for i in items
            ],
        })

    return result


# -----------------------------
# SET PRODUCT RACK CAPACITY
# -----------------------------
@router.post("/set-product-rack-capacity")
def set_product_rack_capacity(
    sku: str,
    rack_type: str,
    max_cartons: int
):

    if max_cartons <= 0:
        return {"error": "Capacity must be greater than 0"}

    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO product_rack_capacity (sku, rack_type, max_cartons)
                VALUES (:sku, :rack_type, :max_cartons)
                ON CONFLICT (sku, rack_type)
                DO UPDATE SET max_cartons = EXCLUDED.max_cartons
            """),
            {
                "sku": sku.strip(),
                "rack_type": rack_type.strip().upper(),
                "max_cartons": max_cartons
            }
        )

    return {"status": "product rack capacity updated"}


# -----------------------------
# STATIC AISLES
# -----------------------------
@router.get("/aisles")
def get_aisles():
    return {"aisles": ALLOWED_AISLES}