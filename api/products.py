# api/products.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.product_service import update_pallet_capacity

router = APIRouter(prefix="/products")

class PalletUpdate(BaseModel):
    sku: str
    pallet_carton_capacity: int

@router.post("/pallet-capacity")
def set_pallet_capacity(payload: PalletUpdate):
    if payload.pallet_carton_capacity <= 0:
        raise HTTPException(400, "Invalid capacity")

    try:
        return update_pallet_capacity(
            payload.sku,
            payload.pallet_carton_capacity
        )
    except ValueError as e:
        raise HTTPException(404, str(e))