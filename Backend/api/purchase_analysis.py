from fastapi import APIRouter, UploadFile, File, HTTPException
import pandas as pd
import numpy as np

router = APIRouter(prefix="/purchase", tags=["Purchase Analysis"])


@router.post("/analyze")
async def analyze_purchase(
    sales_file: UploadFile | None = File(None),
    stock_file: UploadFile | None = File(None),
    supplier_file: UploadFile | None = File(None)
):
    try:

        # ===============================
        # FILE VALIDATION
        # ===============================
        if not sales_file or not stock_file or not supplier_file:
            raise HTTPException(
                status_code=400,
                detail="All three files (sales, stock, supplier) are required"
            )

        # ===============================
        # READ FILES SAFELY
        # ===============================
        def safe_read(file):
            try:
                return pd.read_csv(file.file)
            except:
                file.file.seek(0)
                return pd.read_csv(file.file, encoding="latin1")

        sales_df = safe_read(sales_file)
        stock_df = safe_read(stock_file)
        supplier_df = safe_read(supplier_file)

        # ===============================
        # CLEAN COLUMN NAMES
        # ===============================
        sales_df.columns = sales_df.columns.str.strip().str.lower()
        stock_df.columns = stock_df.columns.str.strip().str.lower()
        supplier_df.columns = supplier_df.columns.str.strip().str.lower()

        # ===============================
        # REQUIRED COLUMNS
        # ===============================
        required_sales = {"date", "sku", "qty_sold"}
        required_stock = {"sku", "current_stock"}
        required_supplier = {
            "sku", "lead_time_days", "moq", "unit_cost", "safety_stock"
        }

        if not required_sales.issubset(sales_df.columns):
            raise HTTPException(status_code=400, detail="Sales file missing required columns")

        if not required_stock.issubset(stock_df.columns):
            raise HTTPException(status_code=400, detail="Stock file missing required columns")

        if not required_supplier.issubset(supplier_df.columns):
            raise HTTPException(status_code=400, detail="Supplier file missing required columns")

        # ===============================
        # SALES PROCESSING
        # ===============================
        sales_df["date"] = pd.to_datetime(sales_df["date"], errors="coerce")
        sales_df = sales_df.dropna(subset=["date"])

        if sales_df.empty:
            raise HTTPException(status_code=400, detail="Sales data is empty")

        total_days = (sales_df["date"].max() - sales_df["date"].min()).days + 1
        if total_days <= 0:
            total_days = 1

        avg_sales = (
            sales_df.groupby("sku")["qty_sold"]
            .sum()
            .reset_index()
        )

        avg_sales["avg_daily_sales"] = avg_sales["qty_sold"] / total_days
        avg_sales = avg_sales[["sku", "avg_daily_sales"]]

        # ===============================
        # MERGE DATA
        # ===============================
        df = avg_sales.merge(stock_df, on="sku", how="right")
        df = df.merge(supplier_df, on="sku", how="left")

        # ===============================
        # CLEAN NUMERIC COLUMNS SAFELY
        # ===============================
        numeric_cols = [
            "avg_daily_sales",
            "current_stock",
            "lead_time_days",
            "safety_stock",
            "moq",
            "unit_cost"
        ]

        for col in numeric_cols:
            if col not in df.columns:
                df[col] = 0
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

        # ===============================
        # CALCULATIONS
        # ===============================
        df["days_cover"] = np.where(
            df["avg_daily_sales"] > 0,
            df["current_stock"] / df["avg_daily_sales"],
            999
        )

        df["reorder_point"] = (
            df["avg_daily_sales"] * df["lead_time_days"]
            + df["safety_stock"]
        )

        df["suggested_order"] = (
            df["reorder_point"] - df["current_stock"]
        ).clip(lower=0)

        # Apply MOQ safely
        df["suggested_order"] = df.apply(
            lambda row: max(row["moq"], row["suggested_order"])
            if row["suggested_order"] > 0 else 0,
            axis=1
        )

        df["capital_required"] = (
            df["suggested_order"] * df["unit_cost"]
        )

        # ===============================
        # STATUS LOGIC
        # ===============================
        def get_status(row):
            if row["current_stock"] <= row["reorder_point"] * 0.7:
                return "URGENT"
            elif row["current_stock"] <= row["reorder_point"]:
                return "ORDER_SOON"
            else:
                return "SAFE"

        df["status"] = df.apply(get_status, axis=1)

        # ===============================
        # FINAL OUTPUT
        # ===============================
        result = df[[
            "sku",
            "avg_daily_sales",
            "current_stock",
            "days_cover",
            "reorder_point",
            "suggested_order",
            "capital_required",
            "status"
        ]]

        result = result.replace([np.inf, -np.inf], 0).fillna(0)

        return result.to_dict(orient="records")

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))