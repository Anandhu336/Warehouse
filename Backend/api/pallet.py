from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from db.database import engine
import uuid

router = APIRouter(prefix="/pallet", tags=["Pallet Builder"])


# -------------------------
# MODELS
# -------------------------

class AddItem(BaseModel):
    pallet_id: str
    sku: str
    cartons: int


class MovePallet(BaseModel):
    pallet_id: str
    location: str


# -------------------------
# CREATE PALLET
# -------------------------

@router.post("/create")
def create_pallet():

    pallet_id = f"TMP-{uuid.uuid4().hex[:6].upper()}"

    with engine.begin() as conn:

        conn.execute(text("""
        INSERT INTO pallets (pallet_id,status)
        VALUES (:pallet,'building')
        """), {"pallet": pallet_id})

    return {"pallet_id": pallet_id}


# -------------------------
# ADD SKU TO PALLET
# -------------------------

@router.post("/add-item")
def add_item(data: AddItem):

    if data.cartons <= 0:
        raise HTTPException(status_code=400, detail="Invalid cartons")

    with engine.begin() as conn:

        product = conn.execute(text("""
        SELECT product_name
        FROM products
        WHERE sku = :sku
        """), {"sku": data.sku}).scalar()

        if not product:
            raise HTTPException(status_code=404, detail="SKU not found")

        conn.execute(text("""
        INSERT INTO pallet_items (pallet_id,sku,cartons)
        VALUES (:pallet,:sku,:cartons)
        ON CONFLICT (pallet_id,sku)
        DO UPDATE SET cartons = pallet_items.cartons + :cartons
        """), {
            "pallet": data.pallet_id,
            "sku": data.sku,
            "cartons": data.cartons
        })

    return {"status": "added"}


# -------------------------
# GET PALLET CONTENT
# -------------------------

@router.get("/{pallet_id}")
def get_pallet(pallet_id: str):

    with engine.begin() as conn:

        rows = conn.execute(text("""
        SELECT
            pi.sku,
            p.product_name,
            pi.cartons
        FROM pallet_items pi
        JOIN products p ON p.sku = pi.sku
        WHERE pi.pallet_id = :pallet
        """), {"pallet": pallet_id}).mappings().all()

    return {
        "pallet_id": pallet_id,
        "items": rows
    }


# -------------------------
# VERIFY PALLET
# -------------------------

@router.post("/verify/{pallet_id}")
def verify_pallet(pallet_id: str):

    with engine.begin() as conn:

        conn.execute(text("""
        UPDATE pallets
        SET status='verified'
        WHERE pallet_id=:p
        """), {"p": pallet_id})

    return {"status": "verified"}


# -------------------------
# MOVE PALLET INTO LOCATION
# -------------------------

@router.post("/move")
def move_pallet(data: MovePallet):

    with engine.begin() as conn:

        items = conn.execute(text("""
        SELECT sku, cartons
        FROM pallet_items
        WHERE pallet_id=:pallet
        """), {"pallet": data.pallet_id}).mappings().all()

        if not items:
            raise HTTPException(status_code=400, detail="Empty pallet")

        for item in items:

            units_per_carton = conn.execute(text("""
            SELECT units_per_carton
            FROM products
            WHERE sku = :sku
            """), {"sku": item["sku"]}).scalar()

            units = units_per_carton * item["cartons"]

            conn.execute(text("""
            INSERT INTO location_stock (location_code,sku,units)
            VALUES (:loc,:sku,:units)
            ON CONFLICT (location_code,sku)
            DO UPDATE SET units = location_stock.units + :units
            """), {
                "loc": data.location,
                "sku": item["sku"],
                "units": units
            })

        conn.execute(text("""
        UPDATE pallets
        SET status='stored'
        WHERE pallet_id=:pallet
        """), {"pallet": data.pallet_id})

    return {"status": "pallet stored"}

@router.get("/dashboard")
def pallet_dashboard():

    with engine.begin() as conn:

        pallets = conn.execute(text("""
        SELECT
            p.pallet_id,
            p.status,
            COUNT(pi.sku) AS total_skus,
            COALESCE(SUM(pi.cartons),0) AS total_cartons
        FROM pallets p
        LEFT JOIN pallet_items pi
        ON p.pallet_id = pi.pallet_id
        GROUP BY p.pallet_id,p.status
        ORDER BY p.pallet_id DESC
        """)).mappings().all()

    return [dict(row) for row in pallets]