# services/product_service.py
from sqlalchemy import text
from db.database import engine

def update_pallet_capacity(sku: str, pallet_carton_capacity: int):
    with engine.begin() as conn:
        result = conn.execute(
            text("""
                UPDATE products
                SET pallet_carton_capacity = :cap
                WHERE sku = :sku
                RETURNING sku, pallet_carton_capacity
            """),
            {"sku": sku, "cap": pallet_carton_capacity}
        ).fetchone()

        if not result:
            raise ValueError("SKU not found")

        return dict(result)
    
    from db.connection import get_db



def get_products_by_skus(skus: list[str]):
    conn = get_connection()
    cur = conn.cursor()

    query = """
        SELECT
            sku,
            product_name,
            units_per_carton,
            carton_barcode
        FROM products
        WHERE sku = ANY(%s)
    """

    cur.execute(query, (skus,))
    rows = cur.fetchall()

    cur.close()
    conn.close()

    return [
        {
            "sku": r[0],
            "product_name": r[1],
            "units_per_carton": r[2],
            "carton_barcode": r[3],
        }
        for r in rows
    ]