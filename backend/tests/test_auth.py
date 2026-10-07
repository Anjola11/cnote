import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_root_health_check(async_client: AsyncClient):
    response = await async_client.get("/")
    assert response.status_code == 200
    assert response.json() == "server working"


@pytest.mark.asyncio
async def test_signup_success(async_client: AsyncClient):
    payload = {
        "email": "newuser@example.com",
        "username": "newuser",
        "password": "StrongPassword123!",
        "confirm_password": "StrongPassword123!"
    }
    response = await async_client.post("/api/v1/auth/signup", json=payload)
    assert response.status_code in [200, 201]
    data = response.json()
    assert data["success"] is True


@pytest.mark.asyncio
async def test_signup_duplicate_email(async_client: AsyncClient):
    payload = {
        "email": "dup@example.com",
        "username": "dupuser1",
        "password": "Password123!",
        "confirm_password": "Password123!"
    }
    res1 = await async_client.post("/api/v1/auth/signup", json=payload)
    assert res1.status_code in [200, 201]

    payload2 = {
        "email": "dup@example.com",
        "username": "dupuser2",
        "password": "Password123!",
        "confirm_password": "Password123!"
    }
    res2 = await async_client.post("/api/v1/auth/signup", json=payload2)
    assert res2.status_code in [400, 409, 422]


@pytest.mark.asyncio
async def test_login_success(async_client: AsyncClient, test_user):
    payload = {
        "email": test_user.email,
        "password": "Password123!"
    }
    response = await async_client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


@pytest.mark.asyncio
async def test_get_current_user_profile(async_client: AsyncClient, auth_headers):
    response = await async_client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["email"] == "testuser@example.com"
