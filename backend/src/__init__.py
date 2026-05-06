from fastapi import FastAPI, HTTPException, status, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from src.config import Config
from fastapi.middleware.cors import CORSMiddleware
from src.utils.logger import logger
from src.db.main import init_db
from src.db.redis import redis_client, check_redis_connection


@asynccontextmanager
async def lifespan(app: FastAPI):

    await init_db()
    logger.info("server starting")

    await check_redis_connection()
    yield

    # Clean up Redis connections on shutdown
    logger.info("Closing Redis Connection")
    if redis_client:
        await redis_client.close()
    logger.info("Server Closed")

app = FastAPI(
    title="API for CNote",
    description="cnote api documentation",
    lifespan=lifespan
)

origins = Config.ALLOWED_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins = origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root_health_check():
    return "server working"


@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc:HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content = {
            "success": False,
            "message": exc.detail,
            "data": None
        }
    )

def format_validation_errors(errors):
    formatted = []
    for err in errors:
        loc = err["loc"]
        field = ".".join(str(l) for l in loc[1:]) if len(loc) > 1 else str(loc[0])
        formatted.append({
            "field": field,
            "message": err["msg"]
        })
    return formatted

@app.exception_handler(RequestValidationError)
async def custom_validation_exception_handler(request:Request, exc: RequestValidationError):
    logger.error(f"validation error", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={
            "success": False,
            "message": "Validation error",
            "errors": format_validation_errors(exc.errors()),
            "data": None
        }
    )