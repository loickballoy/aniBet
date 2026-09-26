from typing import Annotated, Generator

from fastapi import Depends
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.setting import settings

pool = ConnectionPool(
    conninfo=settings.database_url,
    min_size=1,
    max_size=10,
    kwargs={"row_factory": dict_row},
    check=ConnectionPool.check_connection,
    max_idle=120,
    open=False,
)
pool.open()

def get_db() -> Generator:
    with pool.connection() as conn:
        yield conn

db_dependency = Annotated[object, Depends(get_db)]
