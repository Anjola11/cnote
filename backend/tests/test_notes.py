import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_note(async_client: AsyncClient, auth_headers):
    payload = {
        "title": "My First Test Note",
        "category": "general"
    }
    response = await async_client.post("/api/v1/notes/", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["title"] == "My First Test Note"
    assert "id" in data["data"]


@pytest.mark.asyncio
async def test_list_and_get_note(async_client: AsyncClient, auth_headers):
    create_res = await async_client.post("/api/v1/notes/", json={"title": "List Test Note", "category": "programming"}, headers=auth_headers)
    note_id = create_res.json()["data"]["id"]

    list_res = await async_client.get("/api/v1/notes/", headers=auth_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()["data"]) >= 1

    get_res = await async_client.get(f"/api/v1/notes/{note_id}", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["data"]["title"] == "List Test Note"


@pytest.mark.asyncio
async def test_update_note_title_and_content(async_client: AsyncClient, auth_headers):
    create_res = await async_client.post("/api/v1/notes/", json={"title": "Original Title", "category": "general"}, headers=auth_headers)
    note_id = create_res.json()["data"]["id"]
    version = create_res.json()["data"]["version"]

    title_res = await async_client.patch(f"/api/v1/notes/{note_id}/title", json={"title": "Updated Title"}, headers=auth_headers)
    assert title_res.status_code == 200
    assert title_res.json()["data"]["title"] == "Updated Title"

    content_payload = {
        "content": {"type": "doc", "content": [{"type": "paragraph", "text": "Hello World"}]},
        "version": version
    }
    content_res = await async_client.patch(f"/api/v1/notes/{note_id}/content", json=content_payload, headers=auth_headers)
    assert content_res.status_code == 200
    assert content_res.json()["data"]["word_count"] >= 0


@pytest.mark.asyncio
async def test_share_note_and_public_access(async_client: AsyncClient, auth_headers):
    create_res = await async_client.post("/api/v1/notes/", json={"title": "Public Shareable Note", "category": "general"}, headers=auth_headers)
    note_id = create_res.json()["data"]["id"]

    share_res = await async_client.patch(f"/api/v1/notes/{note_id}/share", json={"is_public": True}, headers=auth_headers)
    assert share_res.status_code == 200
    share_token = share_res.json()["data"]["share_token"]
    assert share_token is not None

    public_res = await async_client.get(f"/api/v1/public/notes/{share_token}")
    assert public_res.status_code == 200
    assert public_res.json()["data"]["title"] == "Public Shareable Note"


@pytest.mark.asyncio
async def test_delete_and_restore_note(async_client: AsyncClient, auth_headers):
    create_res = await async_client.post("/api/v1/notes/", json={"title": "To Be Deleted", "category": "general"}, headers=auth_headers)
    note_id = create_res.json()["data"]["id"]

    del_res = await async_client.delete(f"/api/v1/notes/{note_id}", headers=auth_headers)
    assert del_res.status_code == 200

    bin_res = await async_client.get("/api/v1/notes/bin", headers=auth_headers)
    assert bin_res.status_code == 200
    deleted_ids = [n["id"] for n in bin_res.json()["data"]]
    assert note_id in deleted_ids

    restore_res = await async_client.post(f"/api/v1/notes/{note_id}/restore", headers=auth_headers)
    assert restore_res.status_code == 200
    assert restore_res.json()["data"]["title"] == "To Be Deleted"
