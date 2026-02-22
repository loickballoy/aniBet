from starlette.middleware.sessions import SessionMiddleware

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.security import HTTPBearer

from app.routes.auth import AuthRouter
from app.routes.events import EventRouter
from app.routes.bets import BetsRouter

app = FastAPI()

app.add_middleware(SessionMiddleware, secret_key="MYKEY32")
bearer_scheme = HTTPBearer

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(title="aniBet API", version="1.0.0", routes=app.routes)
    schema["components"]["securitySchemes"]["BearerAuth"] = {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
    }
    for path in schema["paths"].values():
        for method in path.values():
            method["security"] = [{"BearerAuth": []}]
    app.openapi_schema = schema
    return schema

app.openapi_schema = None
app.openapi = custom_openapi

@app.get('/')
async def hello_world():
    return {"message": "Hello World"}

app.include_router(AuthRouter)
app.include_router(EventRouter)
app.include_router(BetsRouter)