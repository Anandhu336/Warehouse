from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import API routers
from api.bins import router as bins_router
from api.po_labels import router as po_labels_router
from api.products import router as products_router
from api.location_capacity import router as location_capacity_router
from api.optimizer import router as optimizer_router
from api.uploads import router as upload_router
from api.purchase_analysis import router as purchase_router
from api.scanner import router as scanner_router
from api.pallet import router as pallet_router   # Pallet builder API


app = FastAPI(title="Warehouse API")


# -----------------------------
# CORS (Frontend access)
# -----------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://warehousevsl.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------
# Register API routes
# -----------------------------

app.include_router(bins_router)
app.include_router(po_labels_router)
app.include_router(products_router)
app.include_router(location_capacity_router)
app.include_router(optimizer_router)
app.include_router(upload_router)
app.include_router(purchase_router)
app.include_router(scanner_router)
app.include_router(pallet_router)   # NEW pallet system


# -----------------------------
# Health checks
# -----------------------------

@app.get("/ping")
def ping():
    return {"status": "working"}


@app.get("/")
def root():
    return {"status": "Warehouse API running"}