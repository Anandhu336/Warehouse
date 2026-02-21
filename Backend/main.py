from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.bins import router as bins_router
from api.po_labels import router as po_labels_router
from api.products import router as products_router
from api.location_capacity import router as location_capacity_router
from api.optimizer import router as optimizer_router
from api.uploads import router as upload_router
from api.purchase_analysis import router as purchase_router


app = FastAPI(title="Warehouse API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://warehousevsl.vercel.app",  # Added Vercel frontend domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(bins_router)
app.include_router(po_labels_router)
app.include_router(products_router)
app.include_router(location_capacity_router)
app.include_router(optimizer_router)
app.include_router(upload_router)
app.include_router(purchase_router)

@app.get("/ping")
def ping():
    return {"status": "working"}

@app.get("/")
def root():
    return {"status": "API running"}