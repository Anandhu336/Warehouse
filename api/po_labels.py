from fastapi import APIRouter, UploadFile, File
from sqlalchemy import text
from db.database import engine
import pandas as pd
import io
import math

router = APIRouter(
    prefix="/po",
    tags=["PO Labels"]
)

# --------------------------------------------------
# Helpers
# --------------------------------------------------

def parse_qty(val):
    """
    Parse quantities like:
    700
    1,400
    2,100
    """
    if val is None:
        return 0
    try:
        return int(str(val).replace(",", "").strip())
    except Exception:
        return 0


def clean_barcode(val):
    if val is None:
        return None
    return str(val).replace(".0", "").strip()


# --------------------------------------------------
# POST /po/labels
# --------------------------------------------------

@router.post("/labels")
def generate_labels(file: UploadFile = File(...)):

    df = pd.read_csv(io.StringIO(file.file.read().decode("utf-8")))

    # normalize headers ONLY (do not touch values)
    df.columns = (
        df.columns
        .str.strip()
        .str.lower()
        .str.replace(" ", "")
        .str.replace("_", "")
    )

    # detect required columns
    sku_col = None
    qty_col = None

    for c in df.columns:
        if c in ["sku", "skus"]:
            sku_col = c
        if c in ["qtyoutstanding", "outstandingqty"]:
            qty_col = c

    if not sku_col or not qty_col:
        return {
            "error": "CSV must contain SKU and Qty Outstanding",
            "columns_found": list(df.columns),
        }

    results = []

    with engine.connect() as conn:
        for idx, row in df.iterrows():

            raw_sku = str(row[sku_col]).strip()
            qty_outstanding = parse_qty(row[qty_col])

            product = conn.execute(
                text("""
                    SELECT
                        sku,
                        product_name,
                        units_per_carton,
                        carton_barcode
                    FROM products
                    WHERE sku = :sku
                """),
                {"sku": raw_sku},
            ).mappings().first()

            if product:
                units_per_carton = int(product["units_per_carton"] or 0)

                labels_required = (
                    math.ceil(qty_outstanding / units_per_carton)
                    if units_per_carton > 0
                    else 0
                )

                results.append({
                    "row": idx + 1,
                    "sku": raw_sku,
                    "matched_sku": product["sku"],
                    "product_name": product["product_name"],
                    "qty_outstanding": qty_outstanding,
                    "units_per_carton": units_per_carton,
                    "labels_required": labels_required,
                    "carton_barcode": clean_barcode(product["carton_barcode"]),
                    "needs_user_input": False,
                })

            else:
                # SKU not found → still show PO qty
                results.append({
                    "row": idx + 1,
                    "sku": raw_sku,
                    "matched_sku": None,
                    "product_name": "Manual mapping required",
                    "qty_outstanding": qty_outstanding,
                    "units_per_carton": None,
                    "labels_required": qty_outstanding,
                    "carton_barcode": None,
                    "needs_user_input": True,
                })

    return {
        "total_rows": len(df),
        "labels": results,
    }