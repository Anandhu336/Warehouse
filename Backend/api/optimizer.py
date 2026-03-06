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
# BRAND → FLAVOUR
# =====================================================
@router.get("/flavours")
def get_flavours(
    brand: list[str] | None = Query(None),
    category: list[str] | None = Query(None),
):

    query = """
        SELECT DISTINCT product_name
        FROM products
        WHERE 1=1
    """

    params = {}

    if brand:

        brand_conditions = []

        for i, b in enumerate(brand):
            key = f"brand_{i}"
            brand_conditions.append(f"brand ILIKE :{key}")
            params[key] = f"%{b}%"

        query += " AND (" + " OR ".join(brand_conditions) + ")"


    if category:

        category_conditions = []

        for i, c in enumerate(category):
            key = f"cat_{i}"
            category_conditions.append(f"category ILIKE :{key}")
            params[key] = f"%{c}%"

        query += " AND (" + " OR ".join(category_conditions) + ")"


    query += " ORDER BY product_name"

    with engine.begin() as conn:
        flavours = conn.execute(text(query), params).scalars().all()

    return {"flavours": flavours or []}


# =====================================================
# GET LOCATIONS
# =====================================================
@router.get("/locations")
def get_locations(

    aisle: str | None = Query(None),

    rack: list[str] | None = Query(None),
    shelf: list[str] | None = Query(None),

    category: list[str] | None = Query(None),
    brand: list[str] | None = Query(None),
    flavour: list[str] | None = Query(None),

    search: str | None = Query(None),
    pallet_type: str | None = Query(None),
    empty: bool | None = Query(None),
):

    query = """
        SELECT
            UPPER(ls.location_code) AS location_code,
            ls.sku,
            p.product_name,
            p.brand,
            p.category,
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

    # =====================================================
    # AISLE FILTER
    # =====================================================
    if aisle:

        query += " AND UPPER(ls.location_code) LIKE :aisle"
        params["aisle"] = f"ELECTRA {aisle.upper()}%"

    else:

        query += """
            AND (
                UPPER(ls.location_code) LIKE 'ELECTRA P%' OR
                UPPER(ls.location_code) LIKE 'ELECTRA Q%' OR
                UPPER(ls.location_code) LIKE 'ELECTRA R%' OR
                UPPER(ls.location_code) LIKE 'ELECTRA S%' OR
                UPPER(ls.location_code) LIKE 'ELECTRA T%'
            )
        """


    # =====================================================
    # RACK FILTER
    # =====================================================
    if rack:

        rack_conditions = []

        for i, r in enumerate(rack):
            key = f"rack_{i}"
            rack_conditions.append(f"UPPER(ls.location_code) LIKE :{key}")
            params[key] = f"%{r}-%"

        query += " AND (" + " OR ".join(rack_conditions) + ")"


    # =====================================================
    # SHELF FILTER
    # =====================================================
    if shelf:

        shelf_conditions = []

        for i, s in enumerate(shelf):
            key = f"shelf_{i}"
            shelf_conditions.append(f"UPPER(ls.location_code) LIKE :{key}")
            params[key] = f"%-{s.upper()}%"

        query += " AND (" + " OR ".join(shelf_conditions) + ")"


    # =====================================================
    # CATEGORY FILTER
    # =====================================================
    if category:

        category_conditions = []

        for i, c in enumerate(category):
            key = f"cat_{i}"
            category_conditions.append(f"p.category ILIKE :{key}")
            params[key] = f"%{c}%"

        query += " AND (" + " OR ".join(category_conditions) + ")"


    # =====================================================
    # BRAND FILTER
    # =====================================================
    if brand:

        brand_conditions = []

        for i, b in enumerate(brand):
            key = f"brand_{i}"
            brand_conditions.append(f"p.brand ILIKE :{key}")
            params[key] = f"%{b}%"

        query += " AND (" + " OR ".join(brand_conditions) + ")"


    # =====================================================
    # FLAVOUR FILTER
    # =====================================================
    if flavour:

        flavour_conditions = []

        for i, f in enumerate(flavour):
            key = f"flavour_{i}"
            flavour_conditions.append(f"p.product_name ILIKE :{key}")
            params[key] = f"%{f}%"

        query += " AND (" + " OR ".join(flavour_conditions) + ")"


    # =====================================================
    # SMART SEARCH
    # =====================================================
    if search:

        words = search.strip().split()

        for i, word in enumerate(words):

            key = f"search_{i}"

            query += f"""
                AND (
                    ls.sku ILIKE :{key}
                    OR p.product_name ILIKE :{key}
                    OR ls.location_code ILIKE :{key}
                )
            """

            params[key] = f"%{word}%"


    with engine.begin() as conn:

        rows = conn.execute(text(query), params).mappings().all()

        sku_counts = conn.execute(text("""
            SELECT UPPER(location_code) AS location_code,
                   COUNT(DISTINCT sku) AS sku_count
            FROM location_stock
            GROUP BY location_code
        """)).mappings().all()

        group_overrides = conn.execute(text("""
            SELECT brand, category, max_cartons
            FROM product_group_capacity
        """)).mappings().all()

        location_overrides = conn.execute(text("""
            SELECT UPPER(location_code) AS location_code,
                   max_cartons
            FROM location_capacity
        """)).mappings().all()


    sku_map = {r["location_code"]: r["sku_count"] for r in sku_counts}


    group_map = {
        (r["brand"].strip().lower(), r["category"].strip().lower()):
        int(r["max_cartons"])
        for r in group_overrides
    }


    location_map = {
        r["location_code"]: int(r["max_cartons"])
        for r in location_overrides
    }


    grouped = defaultdict(list)

    for row in rows:
        grouped[row["location_code"]].append(row)


    # =====================================================
    # GENERATE EMPTY PALLETS
    # =====================================================
    if aisle:
        aisles_to_generate = [aisle.upper()]
    else:
        aisles_to_generate = ALLOWED_AISLES


    all_locations = set()

    for aisle_letter in aisles_to_generate:
        for rack_num in range(1, 10):
            for shelf_letter in ["A", "B", "C", "D"]:
                for pos in range(1, 4):

                    code = f"ELECTRA {aisle_letter}{rack_num}-{shelf_letter}{pos}"
                    all_locations.add(code)


    existing_locations = set(grouped.keys())

    for loc in all_locations - existing_locations:
        grouped[loc] = []


    result = []

    for location_code, items in grouped.items():

        total_cartons = sum(int(i["cartons"] or 0) for i in items) if items else 0

        if empty is True and items:
            continue

        if empty is False and not items:
            continue


        sku_count = sku_map.get(location_code, 0)
        is_mixed = sku_count > 1


        if items:
            brand_val = items[0]["brand"].strip().lower()
            category_val = items[0]["category"].strip().lower()
        else:
            brand_val = ""
            category_val = ""


        # =====================================================
        # CAPACITY PRIORITY
        # =====================================================
        if location_code in location_map:

            capacity = location_map[location_code]
            source = "location-override"

        elif (brand_val, category_val) in group_map:

            capacity = group_map[(brand_val, category_val)]
            source = "group-override"

        else:

            capacity = 30
            source = "default"


        occupancy = round((total_cartons / capacity) * 100, 1) if capacity else 0


        if pallet_type == "mixed" and not is_mixed:
            continue

        if pallet_type == "single" and is_mixed:
            continue


        result.append({

            "location_code": location_code,
            "total_cartons": total_cartons,
            "max_cartons": capacity,
            "capacity_source": source,
            "occupancy_percent": occupancy,
            "is_mixed": is_mixed,
            "needs_merge": occupancy < 60,
            "is_empty": len(items) == 0,
            "items": items,

        })


    result.sort(key=lambda x: x["location_code"])

    return result


# =====================================================
# SET GROUP CAPACITY
# =====================================================
@router.post("/set-group-capacity")
def set_group_capacity(data: dict):

    with engine.begin() as conn:

        conn.execute(text("""
            INSERT INTO product_group_capacity (brand, category, max_cartons)
            VALUES (:brand, :category, :max_cartons)

            ON CONFLICT (brand, category)
            DO UPDATE SET max_cartons = EXCLUDED.max_cartons
        """), data)

    return {"status": "updated"}


# =====================================================
# SET LOCATION CAPACITY
# =====================================================
@router.post("/set-location-capacity")
def set_location_capacity(data: dict):

    with engine.begin() as conn:

        conn.execute(text("""
            INSERT INTO location_capacity (location_code, max_cartons)
            VALUES (:location_code, :max_cartons)

            ON CONFLICT (location_code)
            DO UPDATE SET max_cartons = EXCLUDED.max_cartons
        """), data)

    return {"status": "updated"}