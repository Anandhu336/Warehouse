import pandas as pd
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://warehouse_user:warehouse123@localhost/warehouse_db"
CSV_FILE = "wms_product_table.csv"

engine = create_engine(DATABASE_URL)

print("📍 Loading Location Stock...")

df = pd.read_csv(CSV_FILE)
df.columns = df.columns.str.lower().str.strip()

required = ["location", "sku", "units"]

for col in required:
    if col not in df.columns:
        raise Exception(f"Missing required column: {col}")

df = df[required].dropna()

df["location"] = (
    df["location"]
    .astype(str)
    .str.strip()
    .str.upper()
)

df["sku"] = df["sku"].astype(str).str.strip()

df["units"] = pd.to_numeric(
    df["units"],
    errors="coerce"
).fillna(0).astype(int)

df = df[df["units"] > 0]

# Remove ELECTRA prefix if exists
df["location"] = df["location"].str.replace(
    r"^ELECTRA\s+",
    "",
    regex=True
)

# ------------------------------
# Validate SKUs exist in products
# ------------------------------
with engine.connect() as conn:
    valid_skus = pd.read_sql(
        text("SELECT sku FROM products"),
        conn
    )["sku"].tolist()

before = len(df)
df = df[df["sku"].isin(valid_skus)]
after = len(df)

print(f"Filtered location rows: {before} → {after}")
print(f"Skipped invalid SKUs: {before - after}")

# ------------------------------
# FULL REFRESH (recommended)
# ------------------------------
with engine.begin() as conn:

    print("⚠ Clearing old location_stock...")
    conn.execute(text("TRUNCATE location_stock"))

    UPSERT_SQL = """
    INSERT INTO location_stock (location_code, sku, units)
    VALUES (:location, :sku, :units)
    ON CONFLICT (location_code, sku)
    DO UPDATE SET
        units = EXCLUDED.units,
        updated_at = now();
    """

    for _, row in df.iterrows():
        conn.execute(
            text(UPSERT_SQL),
            {
                "location": row["location"],
                "sku": row["sku"],
                "units": row["units"]
            }
        )

print(f"✅ Location stock loaded: {len(df)} rows")