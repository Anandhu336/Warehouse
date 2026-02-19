import pandas as pd
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://warehouse_user:warehouse123@localhost/warehouse_db"
CSV_PATH = "wms_product_table.csv"

engine = create_engine(DATABASE_URL)

print("📦 Loading Product Master...")

df = pd.read_csv(CSV_PATH)
df.columns = df.columns.str.strip().str.lower()

required_columns = [
    "sku",
    "product name",
    "hidden carton qty"
]

for col in required_columns:
    if col not in df.columns:
        raise Exception(f"Missing required column: {col}")

products = df[[
    "sku",
    "product name",
    "category",
    "hidden carton qty",
    "hidden barcode unit",
    "hidden barcode carton",
    "hidden barcode outer"
]].copy()

products = products.dropna(subset=["sku", "product name", "hidden carton qty"])

products = products.rename(columns={
    "product name": "product_name",
    "hidden carton qty": "units_per_carton",
    "hidden barcode unit": "unit_barcode",
    "hidden barcode carton": "carton_barcode",
    "hidden barcode outer": "outer_barcode",
})

# Clean data
products["sku"] = products["sku"].astype(str).str.strip()
products["product_name"] = products["product_name"].astype(str).str.strip()
products["category"] = products["category"].astype(str).str.strip()
products["units_per_carton"] = pd.to_numeric(
    products["units_per_carton"],
    errors="coerce"
).fillna(0).astype(int)

products = products[products["units_per_carton"] > 0]
products = products.drop_duplicates(subset=["sku"])

UPSERT = """
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
        conn.execute(text(UPSERT), row.to_dict())

print(f"✅ Product master loaded: {len(products)} records")