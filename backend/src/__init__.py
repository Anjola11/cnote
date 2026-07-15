from fastapi import APIRouter, FastAPI, HTTPException, status, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from src.config import Config
from fastapi.middleware.cors import CORSMiddleware
from src.utils.logger import logger
from src.db.main import init_db
from src.db.redis import redis_client, check_redis_connection

from src.auth.routes import auth_router
from src.fileUpload.routes import file_router
from src.limiter import limiter
from src.notes.routes import notes_router, public_notes_router
from src.forms.routes import forms_router, public_forms_router
from src.preferences.routes import preferences_router
from slowapi.errors import RateLimitExceeded
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone
from slowapi.middleware import SlowAPIMiddleware


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

app.add_middleware(SlowAPIMiddleware)


app.state.limiter = limiter

origins = Config.ALLOWED_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins = origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def csrf_middleware(request: Request, call_next):
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        if request.cookies.get("access_token"):
            csrf_cookie = request.cookies.get("csrf_token")
            csrf_header = request.headers.get("X-CSRF-Token")
            
            if not csrf_cookie or csrf_cookie != csrf_header:
                logger.warning(f"CSRF verification failed: cookie={csrf_cookie}, header={csrf_header}")
                if Config.ENFORCE_CSRF:
                    return JSONResponse(
                        status_code=status.HTTP_403_FORBIDDEN,
                        content={
                            "success": False,
                            "message": "CSRF token verification failed",
                            "data": None
                        }
                    )
    return await call_next(request)

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


@app.exception_handler(RateLimitExceeded)
async def rate_limit_exception_handler(request: Request, exc):
    headers = getattr(exc, "headers", None) or {}
    retry_after_raw = headers.get("Retry-After") or headers.get("retry-after")

    retry_after_seconds: int = 0
    if retry_after_raw:
        try:
            retry_after_seconds = int(float(str(retry_after_raw)))
        except ValueError:
            # Retry-After can also be an HTTP-date
            try:
                retry_dt = parsedate_to_datetime(str(retry_after_raw))
                if retry_dt.tzinfo is None:
                    retry_dt = retry_dt.replace(tzinfo=timezone.utc)
                now = datetime.now(timezone.utc)
                retry_after_seconds = max(0, int((retry_dt - now).total_seconds()))
            except Exception:
                retry_after_seconds = 0

    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        headers={
            "Retry-After": str(retry_after_seconds),
        },
        content={
            "detail": "Rate limit exceeded",
            "retry_after": retry_after_seconds,
        },
    )



app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(notes_router, prefix="/api/v1/notes", tags=["notes"])
app.include_router(forms_router, prefix="/api/v1/forms", tags=["forms"])
app.include_router(file_router, prefix="/api/v1/upload", tags=["upload"])
app.include_router(public_notes_router, prefix="/api/v1/public", tags=["public"])
app.include_router(public_forms_router, prefix="/api/v1/public", tags=["public"])
app.include_router(preferences_router, prefix="/api/v1/preferences", tags=["preferences"])
