from fastapi import APIRouter
from sqlalchemy import text
from db.database import engine

router = APIRouter(prefix="/bins", tags=["Bins"])

@router.get("")
def get_bins():
    query = """
    SELECT
        UPPER(ls.location_code) AS location_code,

        split_part(UPPER(ls.location_code), '-', 1) AS aisle,

        CASE
            WHEN (
                NULLIF(
                    regexp_replace(
                        split_part(UPPER(ls.location_code), '-', 1),
                        '[^0-9]',
                        '',
                        'g'
                    ),
                    ''
                )::int % 2
            ) = 0
            THEN 'RIGHT'
            ELSE 'LEFT'
        END AS side,

        SUM(
            CASE
                WHEN p.units_per_carton IS NULL OR p.units_per_carton = 0
                THEN 0
                ELSE FLOOR(ls.units::float / p.units_per_carton)
            END
        ) AS total_cartons,

        COALESCE(lc.max_cartons, 0) AS max_cartons,

        CASE
            WHEN SUM(
                CASE
                    WHEN p.units_per_carton IS NULL OR p.units_per_carton = 0
                    THEN 0
                    ELSE FLOOR(ls.units::float / p.units_per_carton)
                END
            ) = 0
            THEN 'EMPTY'

            WHEN lc.max_cartons IS NOT NULL
                 AND SUM(
                    CASE
                        WHEN p.units_per_carton IS NULL OR p.units_per_carton = 0
                        THEN 0
                        ELSE FLOOR(ls.units::float / p.units_per_carton)
                    END
                 ) >= lc.max_cartons
            THEN 'FULL'

            ELSE 'PARTIAL'
        END AS status,

        json_agg(
            json_build_object(
                'sku', ls.sku,
                'product_name', p.product_name,
                'cartons',
                CASE
                    WHEN p.units_per_carton IS NULL OR p.units_per_carton = 0
                    THEN 0
                    ELSE FLOOR(ls.units::float / p.units_per_carton)
                END
            )
            ORDER BY p.product_name
        ) AS items

    FROM location_stock ls
    JOIN products p ON p.sku = ls.sku

    LEFT JOIN location_capacity lc
        ON UPPER(lc.location_code) = UPPER(ls.location_code)

    WHERE split_part(UPPER(ls.location_code), '-', 1) ~ '^[PQRST]'

    GROUP BY UPPER(ls.location_code), lc.max_cartons
    ORDER BY UPPER(ls.location_code);
    """

    with engine.connect() as conn:
        rows = conn.execute(text(query)).mappings().all()

    return rows