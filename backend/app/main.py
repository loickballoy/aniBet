from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware

from app.routes.auth import AuthRouter

app = FastAPI()

@app.get('/')
async def hello_world():
    return {"message": "Hello World"}

app.include_router(AuthRouter)