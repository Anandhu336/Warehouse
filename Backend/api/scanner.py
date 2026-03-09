from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from db.database import engine

router = APIRouter(prefix="/scanner", tags=["Scanner"])


# ------------------------------------------------
# MODELS
# ------------------------------------------------

class MoveRequest(BaseModel):
    sku: str
    from_location: str
    to_location: str
    cartons: int
    user_name: str | None = "scanner"


class RemoveRequest(BaseModel):
    sku: str
    location: str
    cartons: int


class SwapRequest(BaseModel):
    location_a: str
    location_b: str


# ------------------------------------------------
# GET LOCATION CONTENT
# ------------------------------------------------

@router.get("/location/{location_code}")
def get_location(location_code: str):

    with engine.begin() as conn:

        rows = conn.execute(text("""
            SELECT
                ls.sku,
                p.product_name,
                p.category,
                ls.units,
                p.units_per_carton
            FROM location_stock ls
            JOIN products p ON p.sku = ls.sku
            WHERE UPPER(ls.location_code) = UPPER(:loc)
        """), {"loc": location_code}).mappings().all()

        if not rows:
            return {
                "location": location_code,
                "total_skus": 0,
                "total_units": 0,
                "items": []
            }

        total_units = sum(r["units"] for r in rows)

        items = []
        for r in rows:
            items.append({
                "sku": r["sku"],
                "product_name": r["product_name"],
                "category": r["category"],
                "units": r["units"],
                "cartons": r["units"] // r["units_per_carton"]
            })

        return {
            "location": location_code,
            "total_skus": len(items),
            "total_units": total_units,
            "items": items
        }


# ------------------------------------------------
# MOVE STOCK
# ------------------------------------------------

@router.post("/move")
def move_stock(data: MoveRequest):

    if data.cartons <= 0:
        raise HTTPException(status_code=400, detail="Invalid carton quantity")

    if data.from_location.upper() == data.to_location.upper():
        raise HTTPException(status_code=400, detail="Source and destination cannot be the same")

    with engine.begin() as conn:

        product = conn.execute(text("""
            SELECT units_per_carton, product_name
            FROM products
            WHERE sku = :sku
        """), {"sku": data.sku}).mappings().first()

        if not product:
            raise HTTPException(status_code=404, detail="SKU not found")

        units_per_carton = product["units_per_carton"]
        units_to_move = units_per_carton * data.cartons


        source = conn.execute(text("""
            SELECT units
            FROM location_stock
            WHERE location_code = :loc
            AND sku = :sku
        """), {
            "loc": data.from_location,
            "sku": data.sku
        }).mappings().first()

        if not source:
            raise HTTPException(status_code=400, detail="SKU not in source")

        if source["units"] < units_to_move:
            raise HTTPException(status_code=400, detail="Not enough stock")


        conn.execute(text("""
            UPDATE location_stock
            SET units = units - :u
            WHERE location_code = :loc
            AND sku = :sku
        """), {
            "u": units_to_move,
            "loc": data.from_location,
            "sku": data.sku
        })


        conn.execute(text("""
            INSERT INTO location_stock(location_code,sku,units)
            VALUES(:loc,:sku,:u)
            ON CONFLICT(location_code,sku)
            DO UPDATE SET units = location_stock.units + :u
        """), {
            "loc": data.to_location,
            "sku": data.sku,
            "u": units_to_move
        })


        conn.execute(text("""
            INSERT INTO stock_movements(
                sku,from_location,to_location,cartons,user_name
            )
            VALUES(
                :sku,:f,:t,:c,:u
            )
        """), {
            "sku": data.sku,
            "f": data.from_location,
            "t": data.to_location,
            "c": data.cartons,
            "u": data.user_name
        })

    return {"status": "success"}
    

# ------------------------------------------------
# REMOVE STOCK
# ------------------------------------------------

@router.post("/remove")
def remove_stock(data: RemoveRequest):

    if data.cartons <= 0:
        raise HTTPException(status_code=400, detail="Invalid quantity")

    with engine.begin() as conn:

        product = conn.execute(text("""
            SELECT units_per_carton
            FROM products
            WHERE sku = :sku
        """), {"sku": data.sku}).scalar()

        units = product * data.cartons

        conn.execute(text("""
            UPDATE location_stock
            SET units = units - :u
            WHERE location_code = :loc
            AND sku = :sku
        """), {
            "u": units,
            "loc": data.location,
            "sku": data.sku
        })

    return {"status": "removed"}


# ------------------------------------------------
# SWAP LOCATIONS
# ------------------------------------------------

@router.post("/swap")
def swap_locations(data: SwapRequest):

    with engine.begin() as conn:

        conn.execute(text("""
            UPDATE location_stock
            SET location_code = 'TEMP'
            WHERE location_code = :a
        """), {"a": data.location_a})

        conn.execute(text("""
            UPDATE location_stock
            SET location_code = :a
            WHERE location_code = :b
        """), {"a": data.location_a, "b": data.location_b})

        conn.execute(text("""
            UPDATE location_stock
            SET location_code = :b
            WHERE location_code = 'TEMP'
        """), {"b": data.location_b})

    return {"status": "swapped"}