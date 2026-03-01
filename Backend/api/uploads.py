from fastapi import APIRouter, UploadFile, File, HTTPException
from sqlalchemy import text
from db.database import engine
import pandas as pd
import io
from datetime import datetime

router = APIRouter(prefix="/upload", tags=["Upload"])


# -------------------------------------------------
# SAFE INTEGER
# -------------------------------------------------
def safe_int(value):
    try:
        if value in ["", "-", "nan", None]:
            return 0
        return int(float(str(value).strip()))
    except:
        return 0


# -------------------------------------------------
# AUTO MAP COLUMN
# -------------------------------------------------
def auto_map_column(df, expected_name):
    for col in df.columns:
        if expected_name in col:
            df.rename(columns={col: expected_name}, inplace=True)
            return


# =================================================
# 1️⃣ UPLOAD PRODUCT MASTER
# =================================================
@router.post("/products")
async def upload_products(products_file: UploadFile = File(...)):

    try:
        products_df = pd.read_csv(io.BytesIO(await products_file.read()))
        products_df.columns = products_df.columns.str.strip().str.lower()

        auto_map_column(products_df, "sku")
        auto_map_column(products_df, "product name")
        auto_map_column(products_df, "category")
        auto_map_column(products_df, "hidden carton qty")

        required = ["sku", "product name", "hidden carton qty"]

        for col in required:
            if col not in products_df.columns:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required column: {col}"
                )

        products = products_df.dropna(
            subset=["sku", "product name", "hidden carton qty"]
        ).copy()

        products["sku"] = products["sku"].astype(str).str.strip()

        products = products.rename(columns={
            "product name": "product_name",
            "hidden carton qty": "units_per_carton"
        })

        # Optional barcode columns
        for optional in [
            "hidden barcode unit",
            "hidden barcode carton",
            "hidden barcode outer"
        ]:
            if optional not in products.columns:
                products[optional] = None

        products = products.rename(columns={
            "hidden barcode unit": "unit_barcode",
            "hidden barcode carton": "carton_barcode",
            "hidden barcode outer": "outer_barcode"
        })

        products = products.drop_duplicates(subset=["sku"])

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

        with engine.begin() as conn:
            for _, row in products.iterrows():
                conn.execute(text(UPSERT_PRODUCTS), row.to_dict())

            conn.execute(text("""
                INSERT INTO upload_history (product_rows, location_rows, upload_time)
                VALUES (:p, 0, :t)
            """), {
                "p": len(products),
                "t": datetime.utcnow()
            })

        return {
            "status": "product master updated",
            "rows": len(products)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =================================================
# 2️⃣ UPLOAD LOCATION STOCK (SNAPSHOT)
# =================================================
@router.post("/location-stock")
async def upload_location_stock(location_file: UploadFile = File(...)):

    try:
        location_df = pd.read_csv(io.BytesIO(await location_file.read()))
        location_df.columns = location_df.columns.str.strip()

        normalized_rows = []

        for _, row in location_df.iterrows():

            location = str(row.get("Location", "")).strip().upper()
            skus_raw = str(row.get("SKU(s)", "")).strip()
            qty_raw = str(row.get("QTY", "")).strip()

            if not location or skus_raw in ["", "-", "nan"]:
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

        if not location_df_clean.empty:
            location_df_clean = location_df_clean.drop_duplicates(
                subset=["location_code", "sku"]
            )

        UPSERT_LOCATION = """
        INSERT INTO location_stock (location_code, sku, units)
        VALUES (:location_code, :sku, :units)
        ON CONFLICT (location_code, sku)
        DO UPDATE SET units = EXCLUDED.units;
        """

        with engine.begin() as conn:

            # Snapshot mode
            conn.execute(text("TRUNCATE TABLE location_stock"))

            for _, row in location_df_clean.iterrows():
                conn.execute(text(UPSERT_LOCATION), row.to_dict())

            conn.execute(text("""
                INSERT INTO upload_history (product_rows, location_rows, upload_time)
                VALUES (0, :l, :t)
            """), {
                "l": len(location_df_clean),
                "t": datetime.utcnow()
            })

        return {
            "status": "location stock updated",
            "rows": len(location_df_clean)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =================================================
# UPLOAD HISTORY
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
# DELETE SINGLE HISTORY ROW
@router.delete("/history/{history_id}")
def delete_history(history_id: int):
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM upload_history WHERE id = :id"),
            {"id": history_id}
        )
    return {"status": "deleted"}


# CLEAR ALL HISTORY
@router.delete("/history")
def clear_history():
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE upload_history"))
    return {"status": "cleared"}