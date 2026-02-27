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
    with engine.begin() as conn:

        categories = conn.execute(text("""
            SELECT DISTINCT category
            FROM products
            WHERE category IS NOT NULL
              AND TRIM(category) <> ''
            ORDER BY category
        """)).scalars().all()

        brands = conn.execute(text("""
            SELECT DISTINCT brand
            FROM products
            WHERE brand IS NOT NULL
              AND TRIM(brand) <> ''
            ORDER BY brand
        """)).scalars().all()

    return {
        "categories": categories or [],
        "brands": brands or [],
    }


# =====================================================
# BRAND → FLAVOUR DROPDOWN
# =====================================================
@router.get("/flavours")
def get_flavours(
    brand: str | None = Query(None),
    category: str | None = Query(None),
):
    query = """
        SELECT DISTINCT product_name
        FROM products
        WHERE 1=1
    """

    params = {}

    if brand:
        query += " AND brand ILIKE :brand"
        params["brand"] = f"%{brand}%"

    if category:
        query += " AND category ILIKE :category"
        params["category"] = f"%{category}%"

    query += " ORDER BY product_name"

    with engine.begin() as conn:
        flavours = conn.execute(text(query), params).scalars().all()

    return {"flavours": flavours or []}


# =====================================================
# GET LOCATIONS (GROUP CAPACITY LOGIC)
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

    # Powerful multi-word search
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

    with engine.begin() as conn:
        rows = conn.execute(text(base_query), params).mappings().all()

        sku_counts = conn.execute(text("""
            SELECT UPPER(location_code) AS location_code,
                   COUNT(DISTINCT sku) AS sku_count
            FROM location_stock
            GROUP BY location_code
        """)).mappings().all()

        # 🔥 GROUP OVERRIDES (brand + category)
        group_overrides = conn.execute(text("""
            SELECT brand, category, max_cartons
            FROM product_group_capacity
        """)).mappings().all()

    sku_map = {r["location_code"]: r["sku_count"] for r in sku_counts}

    group_map = {
        (r["brand"], r["category"]): int(r["max_cartons"])
        for r in group_overrides
    }

    grouped = defaultdict(list)
    for row in rows:
        grouped[row["location_code"]].append(row)

    result = []

    for location_code, items in grouped.items():

        total_cartons = sum(int(i["cartons"] or 0) for i in items)
        sku_count = sku_map.get(location_code, 0)
        is_mixed = sku_count > 1

        brand = items[0]["brand"]
        category = items[0]["category"]

        # =====================================================
        # CAPACITY PRIORITY
        # 1. Brand + Category override
        # 2. Product default
        # 3. System default (30)
        # =====================================================

        if not is_mixed:

            if (brand, category) in group_map:
                capacity = group_map[(brand, category)]
                capacity_source = "group-override"

            elif items[0]["pallet_carton_capacity"]:
                capacity = int(items[0]["pallet_carton_capacity"])
                capacity_source = "product-default"

            else:
                capacity = 30
                capacity_source = "system-default"

        else:
            capacity = 30
            capacity_source = "mixed-default"

        if capacity <= 0:
            capacity = 30

        occupancy_percent = round((total_cartons / capacity) * 100, 1)

        if pallet_type == "mixed" and not is_mixed:
            continue
        if pallet_type == "single" and is_mixed:
            continue

        result.append({
            "location_code": location_code,
            "total_cartons": total_cartons,
            "max_cartons": capacity,
            "capacity_source": capacity_source,
            "occupancy_percent": occupancy_percent,
            "is_mixed": is_mixed,
            "needs_merge": occupancy_percent < 60,
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
# SET GROUP CAPACITY (NEW)
# =====================================================
@router.post("/set-group-capacity")
def set_group_capacity(data: dict):

    query = """
    INSERT INTO product_group_capacity (brand, category, max_cartons)
    VALUES (:brand, :category, :max_cartons)
    ON CONFLICT (brand, category)
    DO UPDATE SET max_cartons = EXCLUDED.max_cartons;
    """

    with engine.begin() as conn:
        conn.execute(
            text(query),
            {
                "brand": data["brand"],
                "category": data["category"],
                "max_cartons": data["max_cartons"],
            },
        )

    return {"status": "updated"}