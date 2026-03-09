from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from db.database import engine

router = APIRouter(prefix="/scanner", tags=["Scanner"])


class MoveRequest(BaseModel):
    sku: str
    from_location: str
    to_location: str
    cartons: int
    user_name: str | None = "scanner"


@router.post("/move")
def move_stock(data: MoveRequest):

    if data.cartons <= 0:
        raise HTTPException(status_code=400, detail="Invalid carton quantity")

    if data.from_location.upper() == data.to_location.upper():
        raise HTTPException(status_code=400, detail="Source and destination cannot be the same")

    with engine.begin() as conn:

        # ------------------------------------------------
        # 1. Get product carton size
        # ------------------------------------------------
        product = conn.execute(text("""
            SELECT units_per_carton, product_name
            FROM products
            WHERE sku = :sku
        """), {"sku": data.sku}).mappings().first()

        if not product:
            raise HTTPException(status_code=404, detail="SKU not found")

        units_per_carton = product["units_per_carton"] or 0
        units_to_move = units_per_carton * data.cartons


        # ------------------------------------------------
        # 2. Check source stock
        # ------------------------------------------------
        source = conn.execute(text("""
            SELECT units
            FROM location_stock
            WHERE UPPER(location_code) = UPPER(:loc)
              AND sku = :sku
        """), {
            "loc": data.from_location,
            "sku": data.sku
        }).mappings().first()

        if not source:
            raise HTTPException(status_code=400, detail="SKU not found in source location")

        if source["units"] < units_to_move:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough stock. Available cartons: {source['units'] // units_per_carton}"
            )


        # ------------------------------------------------
        # 3. Deduct from source
        # ------------------------------------------------
        conn.execute(text("""
            UPDATE location_stock
            SET units = units - :units
            WHERE UPPER(location_code) = UPPER(:loc)
              AND sku = :sku
        """), {
            "units": units_to_move,
            "loc": data.from_location,
            "sku": data.sku
        })


        # ------------------------------------------------
        # 4. Add to destination
        # ------------------------------------------------
        conn.execute(text("""
            INSERT INTO location_stock (location_code, sku, units)
            VALUES (:loc, :sku, :units)
            ON CONFLICT (location_code, sku)
            DO UPDATE
            SET units = location_stock.units + :units
        """), {
            "loc": data.to_location,
            "sku": data.sku,
            "units": units_to_move
        })


        # ------------------------------------------------
        # 5. Log stock movement
        # ------------------------------------------------
        conn.execute(text("""
            INSERT INTO stock_movements (
                sku,
                from_location,
                to_location,
                cartons,
                user_name
            )
            VALUES (
                :sku,
                :from_loc,
                :to_loc,
                :cartons,
                :user_name
            )
        """), {
            "sku": data.sku,
            "from_loc": data.from_location,
            "to_loc": data.to_location,
            "cartons": data.cartons,
            "user_name": data.user_name
        })


        # ------------------------------------------------
        # 6. Get updated stock for UI
        # ------------------------------------------------
        destination_stock = conn.execute(text("""
            SELECT units
            FROM location_stock
            WHERE UPPER(location_code) = UPPER(:loc)
              AND sku = :sku
        """), {
            "loc": data.to_location,
            "sku": data.sku
        }).scalar()


    return {
        "status": "success",
        "product": product["product_name"],
        "moved_cartons": data.cartons,
        "destination_cartons": destination_stock // units_per_carton
    }