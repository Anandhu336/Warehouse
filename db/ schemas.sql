from pydantic import BaseModel

class PalletCapacityUpdate(BaseModel):
    sku: str
    pallet_carton_capacity: int