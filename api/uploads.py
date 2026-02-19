from fastapi import APIRouter, UploadFile, File, HTTPException
from sqlalchemy import text
from db.database import engine
import pandas as pd
import io
from datetime import datetime

router = APIRouter(prefix="/upload", tags=["Upload"])


# -------------------------------------------------
# SAFE INTEGER CONVERSION
# -------------------------------------------------
def safe_int(value):
    try:
        if value in ["", "-", "nan", None]:
            return 0
        return int(float(str(value).strip()))
    except:
        return 0


# =================================================
# MAIN UPLOAD ENDPOINT
# =================================================
@router.post("/warehouse-data")
async def upload_warehouse_data(
    products_file: UploadFile = File(...),
    location_file: UploadFile = File(...)
):

    try:
        # -------------------------
        # READ FILES
        # -------------------------
        products_df = pd.read_csv(io.BytesIO(await products_file.read()))
        location_df = pd.read_csv(io.BytesIO(await location_file.read()))

        products_df.columns = products_df.columns.str.strip().str.lower()
        location_df.columns = location_df.columns.str.strip()

        # -------------------------
        # VALIDATE REQUIRED PRODUCT COLUMNS
        # -------------------------
        required_product_cols = [
            "sku",
            "product name",
            "category",
            "hidden carton qty",
            "hidden barcode unit",
            "hidden barcode carton",
            "hidden barcode outer",
        ]

        for col in required_product_cols:
            if col not in products_df.columns:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required column in product file: {col}"
                )

        # -------------------------
        # PREPARE PRODUCTS
        # -------------------------
        products = products_df[required_product_cols].dropna(
            subset=["sku", "product name", "hidden carton qty"]
        )

        products = products.rename(columns={
            "product name": "product_name",
            "hidden carton qty": "units_per_carton",
            "hidden barcode unit": "unit_barcode",
            "hidden barcode carton": "carton_barcode",
            "hidden barcode outer": "outer_barcode",
        })

        products["sku"] = products["sku"].astype(str).str.strip()
        products = products.drop_duplicates(subset=["sku"])

        # -------------------------
        # UPSERT PRODUCTS
        # -------------------------
        UPSERT_PRODUCTS = """
        INSERT INTO products (
            sku,
            product_name,
            category,
            units_per_carton,
            unit_barcode,
            carton_barcode,
            outer_barcode
        )
        VALUES (
            :sku,
            :product_name,
            :category,
            :units_per_carton,
            :unit_barcode,
            :carton_barcode,
            :outer_barcode
        )
        ON CONFLICT (sku) DO UPDATE SET
            product_name = EXCLUDED.product_name,
            category = EXCLUDED.category,
            units_per_carton = EXCLUDED.units_per_carton,
            unit_barcode = EXCLUDED.unit_barcode,
            carton_barcode = EXCLUDED.carton_barcode,
            outer_barcode = EXCLUDED.outer_barcode;
        """

        # -------------------------
        # NORMALIZE LOCATION DATA
        # -------------------------
        normalized_rows = []

        for _, row in location_df.iterrows():

            location = str(row.get("Location", "")).strip().upper()
            skus_raw = str(row.get("SKU(s)", "")).strip()
            qty_raw = str(row.get("QTY", "")).strip()

            if skus_raw in ["", "-", "nan"]:
                continue

            skus = skus_raw.split()
            qtys = qty_raw.split()

            if len(skus) != len(qtys):
                continue

            for sku, qty in zip(skus, qtys):
                normalized_rows.append({
                    "location_code": location,
                    "sku": sku.strip(),
                    "units": safe_int(qty)
                })

        location_df_clean = pd.DataFrame(normalized_rows)

        # -------------------------
        # UPSERT LOCATION STOCK
        # -------------------------
        UPSERT_LOCATION = """
        INSERT INTO location_stock (location_code, sku, units)
        VALUES (:location_code, :sku, :units)
        ON CONFLICT (location_code, sku)
        DO UPDATE SET
            units = EXCLUDED.units,
            updated_at = now();
        """

        # -------------------------
        # EXECUTE DB OPERATIONS
        # -------------------------
        with engine.begin() as conn:

            for _, row in products.iterrows():
                conn.execute(text(UPSERT_PRODUCTS), row.to_dict())

            for _, row in location_df_clean.iterrows():
                conn.execute(text(UPSERT_LOCATION), row.to_dict())

            # Save upload history
            conn.execute(text("""
                INSERT INTO upload_history (
                    product_rows,
                    location_rows,
                    upload_time
                )
                VALUES (
                    :product_rows,
                    :location_rows,
                    :upload_time
                )
            """), {
                "product_rows": len(products),
                "location_rows": len(location_df_clean),
                "upload_time": datetime.utcnow()
            })

        return {
            "status": "success",
            "products_loaded": len(products),
            "locations_loaded": len(location_df_clean)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =================================================
# GET UPLOAD HISTORY
# =================================================
@router.get("/history")
def get_upload_history():
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT *
            FROM upload_history
            ORDER BY upload_time DESC
            LIMIT 20
        """)).mappings().all()

    return rows