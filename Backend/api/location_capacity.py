from fastapi import APIRouter
from sqlalchemy import text
from db.database import engine

router = APIRouter(prefix="/locations", tags=["Locations"])


@router.post("/pallet-capacity")
def set_pallet_capacity(data: dict):

    query = """
    INSERT INTO location_capacity (location_code, max_cartons)
    VALUES (:location_code, :capacity)
    ON CONFLICT (location_code)
    DO UPDATE SET
        max_cartons = EXCLUDED.max_cartons,
        updated_at = NOW();
    """

    with engine.begin() as conn:
        conn.execute(
            text(query),
            {
                "location_code": data["location_code"],
                "capacity": data["max_cartons"],
            },
        )

    return {"status": "saved"}