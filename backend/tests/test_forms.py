import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_and_publish_form(async_client: AsyncClient, auth_headers):
    create_res = await async_client.post("/api/v1/forms/", json={"title": "Customer Feedback Survey"}, headers=auth_headers)
    assert create_res.status_code == 201
    form_data = create_res.json()["data"]
    form_id = form_data["id"]
    assert form_data["title"] == "Customer Feedback Survey"
    assert form_data["is_published"] is False

    field_payload = {
        "type": "short_answer",
        "label": "What is your name?",
        "is_required": True
    }
    field_res = await async_client.post(f"/api/v1/forms/{form_id}/fields", json=field_payload, headers=auth_headers)
    assert field_res.status_code == 201
    field_data = field_res.json()["data"]
    assert field_data["label"] == "What is your name?"

    pub_res = await async_client.patch(f"/api/v1/forms/{form_id}", json={"is_published": True}, headers=auth_headers)
    assert pub_res.status_code in [200, 201]

    return form_id, field_data["id"]


@pytest.mark.asyncio
async def test_public_form_submission_and_analytics(async_client: AsyncClient, auth_headers):
    create_res = await async_client.post("/api/v1/forms/", json={"title": "Product Research Form"}, headers=auth_headers)
    form_id = create_res.json()["data"]["id"]

    field_res = await async_client.post(
        f"/api/v1/forms/{form_id}/fields",
        json={"type": "short_answer", "label": "Favorite Feature", "is_required": True},
        headers=auth_headers
    )
    field_id = field_res.json()["data"]["id"]

    await async_client.patch(f"/api/v1/forms/{form_id}", json={"is_published": True}, headers=auth_headers)

    pub_fetch = await async_client.get(f"/api/v1/public/forms/{form_id}")
    assert pub_fetch.status_code == 200
    assert pub_fetch.json()["data"]["title"] == "Product Research Form"

    sub_payload = {
        "answers": [
            {"field_id": field_id, "value": "AI Copilot"}
        ]
    }
    sub_res = await async_client.post(f"/api/v1/public/forms/{form_id}/responses", json=sub_payload)
    assert sub_res.status_code == 201
    assert sub_res.json()["success"] is True

    responses_res = await async_client.get(f"/api/v1/forms/{form_id}/responses", headers=auth_headers)
    assert responses_res.status_code == 200
    responses_list = responses_res.json()["data"]
    assert len(responses_list) == 1
    assert responses_list[0]["answers"][0]["value"] == "AI Copilot"

    csv_res = await async_client.get(f"/api/v1/forms/{form_id}/responses/export", headers=auth_headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "AI Copilot" in csv_res.text
