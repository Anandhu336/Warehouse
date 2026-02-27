from fastapi import APIRouter, Query
from sqlalchemy import text
from db.database import engine
from collections import defaultdict

router = APIRouter(prefix="/optimizer", tags=["Optimizer"])

ALLOWED_AISLES = ["P", "Q", "R", "S", "T"]

# =====================================================
# FILTER OPTIONS
# =====================================================
@router.get("/filters")
def get_filters():
    try:
        with engine.begin() as conn:

            categories = conn.execute(text("""
                SELECT category
                FROM products
                WHERE category IS NOT NULL
                  AND TRIM(category) <> ''
                GROUP BY category
                ORDER BY category
            """)).scalars().all()

            brands = conn.execute(text("""
                SELECT brand
                FROM products
                WHERE brand IS NOT NULL
                  AND TRIM(brand) <> ''
                GROUP BY brand
                ORDER BY brand
            """)).scalars().all()

        return {
            "categories": categories or [],
            "brands": brands or [],
        }

    except Exception:
        return {"categories": [], "brands": []}


# =====================================================
# GET LOCATIONS (HYBRID CAPACITY LOGIC)
# =====================================================
@router.get("/locations")
def get_locations(
    aisle: str | None = Query(None),
    category: str | None = Query(None),
    brand: str | None = Query(None),
    search: str | None = Query(None),
    pallet_type: str | None = Query(None),
):

    base_query = """
        SELECT
            UPPER(ls.location_code) AS location_code,

            LEFT(
                split_part(split_part(ls.location_code, ' ', 2), '-', 1),
                1
            ) AS aisle,

            split_part(
                split_part(ls.location_code, ' ', 2),
                '-',
                2
            ) AS rack_type,

            ls.sku,
            p.product_name,
            p.brand,
            p.category,
            p.pallet_carton_capacity,

            FLOOR(
                CASE
                    WHEN p.units_per_carton IS NULL OR p.units_per_carton = 0
                    THEN 0
                    ELSE ls.units::float / p.units_per_carton
                END
            ) AS cartons

        FROM location_stock ls
        JOIN products p ON p.sku = ls.sku
        WHERE 1=1
    """

    params = {}

    # ELECTRA aisle filter
    if aisle:
        base_query += " AND UPPER(ls.location_code) LIKE :aisle_prefix"
        params["aisle_prefix"] = f"ELECTRA {aisle.upper()}%"
    else:
        base_query += """
            AND (
                UPPER(ls.location_code) LIKE 'ELECTRA P%' OR
                UPPER(ls.location_code) LIKE 'ELECTRA Q%' OR
                UPPER(ls.location_code) LIKE 'ELECTRA R%' OR
                UPPER(ls.location_code) LIKE 'ELECTRA S%' OR
                UPPER(ls.location_code) LIKE 'ELECTRA T%'
            )
        """

    if category:
        base_query += " AND p.category ILIKE :category"
        params["category"] = f"%{category}%"

    if brand:
        base_query += " AND p.brand ILIKE :brand"
        params["brand"] = f"%{brand}%"

    # Multi-word search
    if search:
        words = search.strip().split()
        for idx, word in enumerate(words):
            key = f"search_{idx}"
            base_query += f"""
                AND (
                    ls.sku ILIKE :{key}
                    OR p.product_name ILIKE :{key}
                )
            """
            params[key] = f"%{word}%"

    base_query += """
        AND (
            CASE
                WHEN p.units_per_carton IS NULL OR p.units_per_carton = 0
                THEN 0
                ELSE ls.units::float / p.units_per_carton
            END
        ) > 0
    """

    with engine.begin() as conn:
        rows = conn.execute(text(base_query), params).mappings().all()

        sku_check = conn.execute(text("""
            SELECT UPPER(location_code) AS location_code,
                   COUNT(DISTINCT sku) AS sku_count
            FROM location_stock
            GROUP BY location_code
        """)).mappings().all()

        # Manual overrides
        overrides = conn.execute(text("""
            SELECT UPPER(location_code) AS location_code,
                   max_cartons
            FROM location_capacity
        """)).mappings().all()

    sku_map = {r["location_code"]: r["sku_count"] for r in sku_check}
    override_map = {r["location_code"]: r["max_cartons"] for r in overrides}

    grouped = defaultdict(list)
    for row in rows:
        grouped[row["location_code"]].append(row)

    result = []

    for location_code, items in grouped.items():

        total_cartons = sum(int(i["cartons"] or 0) for i in items)
        real_sku_count = sku_map.get(location_code, 0)
        is_mixed = real_sku_count > 1

        # 🔥 HYBRID CAPACITY LOGIC
        if location_code in override_map:
            capacity = override_map[location_code]
        elif not is_mixed:
            capacity = int(items[0]["pallet_carton_capacity"] or 30)
        else:
            capacity = 30

        occupancy_percent = round((total_cartons / capacity) * 100, 1) if capacity > 0 else 0
        needs_merge = occupancy_percent < 60

        # Pallet filter
        if pallet_type == "mixed" and not is_mixed:
            continue
        if pallet_type == "single" and is_mixed:
            continue

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


# =====================================================
# STATIC AISLES
# =====================================================
@router.get("/aisles")
def get_aisles():
    return {"aisles": ALLOWED_AISLES}