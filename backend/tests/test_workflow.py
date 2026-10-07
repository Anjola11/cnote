import pytest
from httpx import AsyncClient
from sqlmodel import select
from src.auth.models import User

@pytest.mark.asyncio
async def test_complete_user_lifecycle_workflow(async_client: AsyncClient, db_session):
    # 1. Signup User
    signup_payload = {
        "email": "workflow@example.com",
        "username": "workflow_user",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!"
    }
    signup_res = await async_client.post("/api/v1/auth/signup", json=signup_payload)
    assert signup_res.status_code in [200, 201]

    # Verify user in database
    res = await db_session.exec(select(User).where(User.email == "workflow@example.com"))
    user = res.first()
    if user:
        user.is_verified = True
        db_session.add(user)
        await db_session.commit()

    # 2. Login User
    login_payload = {
        "email": "workflow@example.com",
        "password": "SecurePassword123!"
    }
    login_res = await async_client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200
    data = login_res.json()
    token = data.get('access_token') or (data.get('data') or {}).get('access_token')
    headers = {'Authorization': f'Bearer {token}'}

    # 3. Get User Profile
    me_res = await async_client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["data"]["email"] == "workflow@example.com"

    # 4. Create Note and Update Content
    create_note = await async_client.post("/api/v1/notes/", json={"title": "Workflow Note", "category": "programming"}, headers=headers)
    assert create_note.status_code == 201
    note_id = create_note.json()["data"]["id"]

    await async_client.patch(
        f"/api/v1/notes/{note_id}/title",
        json={"title": "Mastering Python & AsyncIO"},
        headers=headers
    )

    # 5. Share Note Publicly
    share_res = await async_client.patch(f"/api/v1/notes/{note_id}/share", json={"is_public": True}, headers=headers)
    share_token = share_res.json()["data"]["share_token"]

    public_note_res = await async_client.get(f"/api/v1/public/notes/{share_token}")
    assert public_note_res.status_code == 200
    assert public_note_res.json()["data"]["title"] == "Mastering Python & AsyncIO"

    # 6. Create Form and Add Question Field
    create_form = await async_client.post("/api/v1/forms/", json={"title": "Developer Feedback Form"}, headers=headers)
    assert create_form.status_code == 201
    form_id = create_form.json()["data"]["id"]

    add_field = await async_client.post(
        f"/api/v1/forms/{form_id}/fields",
        json={"type": "short_answer", "label": "Which language do you prefer?", "is_required": True},
        headers=headers
    )
    field_id = add_field.json()["data"]["id"]

    await async_client.patch(f"/api/v1/forms/{form_id}", json={"is_published": True}, headers=headers)

    # 7. Anonymous User Submits Response to Public Form
    sub_res = await async_client.post(
        f"/api/v1/public/forms/{form_id}/responses",
        json={"answers": [{"field_id": field_id, "value": "Python"}]}
    )
    assert sub_res.status_code == 201

    # 8. Form Owner Views Responses & Export
    responses = await async_client.get(f"/api/v1/forms/{form_id}/responses", headers=headers)
    assert responses.status_code == 200
    assert len(responses.json()["data"]) == 1

    # Note: /responses/summary uses PostgreSQL ALY(?) syntax
    export_res = await async_client.get(f'/api/v1/forms/{form_id}/responses/export', headers=headers)
    assert export_res.status_code == 200

    csv_export = await async_client.get(f"/api/v1/forms/{form_id}/responses/export", headers=headers)
    assert csv_export.status_code == 200
    assert "Python" in csv_export.text

    # 9. Soft-delete Note to Bin
    del_res = await async_client.delete(f"/api/v1/notes/{note_id}", headers=headers)
    assert del_res.status_code == 200
