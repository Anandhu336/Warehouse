from sqlalchemy import create_engine

DATABASE_URL = "postgresql://warehouse_user:warehouse123@localhost/warehouse_db"

engine = create_engine(DATABASE_URL)