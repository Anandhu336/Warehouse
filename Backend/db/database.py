from sqlalchemy import create_engine

DATABASE_URL = "postgresql://warehouse_wlem_user:8lqVuXJSW1art6isywgI3iTgYsGygjq1@dpg-d6cma8ogjchc739o0mlg-a/warehouse_wlem"

engine = create_engine(DATABASE_URL)