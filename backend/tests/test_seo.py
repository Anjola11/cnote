import pytest
import uuid
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_seo_note_endpoint(async_client: AsyncClient, auth_headers):
    create_res = await async_client.post("/api/v1/notes/", json={"title": "SEO Test Note", "category": "general"}, headers=auth_headers)
    note_id = create_res.json()["data"]["id"]

    share_res = await async_client.patch(f"/api/v1/notes/{note_id}/share", json={"is_public": True}, headers=auth_headers)
    token = share_res.json()["data"]["share_token"]

    seo_res = await async_client.get(f"/api/v1/public/seo/note/{token}")
    assert seo_res.status_code == 200
    assert seo_res.headers.get("Cache-Control") == "public, s-maxage=300, stale-while-revalidate=86400"
    assert seo_res.headers.get("X-Robots-Tag") == "noindex"
    
    data = seo_res.json()["data"]
    assert data["type"] == "note"
    assert data["title"] == "SEO Test Note"
    assert data["share_token"] == token


@pytest.mark.asyncio
async def test_seo_form_endpoint_strict_noindex(async_client: AsyncClient, auth_headers):
    create_res = await async_client.post("/api/v1/forms/", json={"title": "SEO Form Test"}, headers=auth_headers)
    form_id = create_res.json()["data"]["id"]
    await async_client.patch(f"/api/v1/forms/{form_id}", json={"is_published": True}, headers=auth_headers)

    seo_res = await async_client.get(f"/api/v1/public/seo/form/{form_id}")
    assert seo_res.status_code == 200
    assert seo_res.headers.get("Cache-Control") == "public, s-maxage=300, stale-while-revalidate=86400"
    assert seo_res.headers.get("X-Robots-Tag") == "noindex, nofollow"
    
    data = seo_res.json()["data"]
    assert data["type"] == "form"
    assert data["title"] == "SEO Form Test"
    assert data["id"] == form_id


@pytest.mark.asyncio
async def test_seo_sitemap_entries_excludes_forms(async_client: AsyncClient, auth_headers):
    create_note = await async_client.post("/api/v1/notes/", json={"title": "Sitemap Note", "category": "general"}, headers=auth_headers)
    note_id = create_note.json()["data"]["id"]
    share_res = await async_client.patch(f"/api/v1/notes/{note_id}/share", json={"is_public": True}, headers=auth_headers)
    note_token = share_res.json()["data"]["share_token"]

    create_form = await async_client.post("/api/v1/forms/", json={"title": "Sitemap Form"}, headers=auth_headers)
    form_id = create_form.json()["data"]["id"]
    await async_client.patch(f"/api/v1/forms/{form_id}", json={"is_published": True}, headers=auth_headers)

    sitemap_res = await async_client.get("/api/v1/public/seo/sitemap-entries")
    assert sitemap_res.status_code == 200
    entries = sitemap_res.json()["data"]

    types = [e["type"] for e in entries]
    tokens = [e["identifier"] for e in entries]

    assert "note" in types
    assert note_token in tokens
    assert "form" not in types
    assert str(form_id) not in tokens


@pytest.mark.asyncio
async def test_seo_nonexistent_returns_404(async_client: AsyncClient):
    res_note = await async_client.get("/api/v1/public/seo/note/non-existent-token-12345")
    assert res_note.status_code == 404

    random_uuid = str(uuid.uuid4())
    res_form = await async_client.get(f"/api/v1/public/seo/form/{random_uuid}")
    assert res_form.status_code == 404
