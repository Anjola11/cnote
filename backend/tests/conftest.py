import os

os.environ["IS_PRODUCTION"] = "False"
os.environ["ENFORCE_CSRF"] = "False"
os.environ["JWT_KEY"] = "test-secret-jwt-key-1234567890-super-secure"
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["ALLOWED_ORIGINS"] = '["http://localhost:5173", "https://www.usecnote.xyz"]'
os.environ["BREVO_API_KEY"] = "test-brevo-api-key"
os.environ["BREVO_SENDER_NAME"] = "Cnote Test"
os.environ["BREVO_EMAIL"] = "test@example.com"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["REDIS_URL"] = "redis://localhost:6379"
os.environ["CLOUDINARY_CLOUD_NAME"] = "test-cloud"
os.environ["CLOUDINARY_API_KEY"] = "123456789"
os.environ["CLOUDINARY_API_SECRET"] = "test-secret"

import pytest
import pytest_asyncio
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import JSONB
from unittest.mock import AsyncMock, patch

@compiles(JSONB, "sqlite")
def compile_jaonb_sqlite(type_, compiler, **kw):
    return "JSON"

from src import app
from src.db.main import get_session
from src.auth.models import User
from src.utils.auth import generate_password_hash, create_token, TokenType
from src.notes.models import Note, NoteCategory
from src.forms.models import Form, FormField, FormFieldType

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest.fixture(scope="session", autouse=True)
def override_external_services():
    with patch("src.db.redis.check_redis_connection", new_callable=AsyncMock), \
         patch("src.db.redis.redis_client", new_callable=AsyncMock), \
         patch("src.emailServices.main.EmailServices.send_email", return_value=True):
        yield

@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)


async def override_get_session() -> AsyncGenerator[AsyncSession, None]:
    async with TestingSessionLocal() as session:
        yield session


app.dependency_overrides[get_session] = override_get_session


@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with TestingSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    user = User(
        email="testuser@example.com",
        username="testuser",
        password_hash=generate_password_hash("Password123!"),
        is_verified=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.fixture
def auth_headers(test_user: User) -> dict:
    user_payload = {
        "uid": str(test_user.uid),
        "email": test_user.email,
        "is_verified": test_user.is_verified,
        "session_version": test_user.session_version,
    }
    token = create_token(user_payload, token_type=TokenType.ACCESS)
    return {"Authorization": f"Bearer {token}"}
