from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response, status
from fastapi.responses import StreamingResponse
from sqlmodel.ext.asyncio.session import AsyncSession

from src.db.main import get_session
from src.forms.schemas import (
    DeletedFormsListResponse,
    FieldReorderBody,
    FormCreate,
    FormDeleteResponse,
    FormFieldCreate,
    FormFieldResponse,
    FormFieldUpdate,
    FormResponse_,
    FormsListResponse,
    FormUpdate,
    PublicFormResponse,
    ResponsesListResponse,
    ResponsesSummaryResponse,
    SubmitResponseIn,
    SubmitResponseOut,
    BulkDeleteResponsesIn,
    BulkDeleteResponse_,
    ResponseDeleteResponse,
    EditResponseIn,
    EditResponseResponse,
)
from src.forms.services import FormServices
from src.limiter import get_user_id_or_ip, limiter
from src.utils.dependencies import get_verified_user_id
from src.utils.responses import success_response

forms_router = APIRouter()
public_forms_router = APIRouter()


def get_form_services() -> FormServices:
    return FormServices()


# ──────────────────────────────────────────────────────────────────────────────
# Authenticated routes
# ──────────────────────────────────────────────────────────────────────────────

@forms_router.post("/", response_model=FormResponse_, status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute", key_func=get_user_id_or_ip)
async def create_form(
    request: Request,
    form_input: FormCreate,
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    form_services: FormServices = Depends(get_form_services),
):
    form = await form_services.create_form(user_id=user_id, form_input=form_input, session=session)
    return success_response(message="Form created", data=form)


@forms_router.get("/", response_model=FormsListResponse, status_code=status.HTTP_200_OK)
@limiter.limit("60/minute", key_func=get_user_id_or_ip)
async def list_forms(
    request: Request,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    form_services: FormServices = Depends(get_form_services),
):
    forms = await form_services.list_forms(user_id=user_id, session=session, limit=limit, offset=offset)
    return success_response(message="Forms fetched successfully", data=forms)


@forms_router.get("/bin", response_model=DeletedFormsListResponse, status_code=status.HTTP_200_OK)
@limiter.limit("60/minute", key_func=get_user_id_or_ip)
async def list_deleted_forms(
    request: Request,
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    form_services: FormServices = Depends(get_form_services),
):
    forms = await form_services.list_deleted_forms(user_id=user_id, session=session)
    return success_response(message="Deleted forms fetched successfully", data=forms)


@forms_router.get("/{form_id}", response_model=FormResponse_, status_code=status.HTTP_200_OK)
@limiter.limit("120/minute", key_func=get_user_id_or_ip)
async def get_form(
    request: Request,
    form_id: UUID,
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    form_services: FormServices = Depends(get_form_services),
):
    form = await form_services.get_form(form_id=form_id, user_id=user_id, session=session)
    return success_response(message="Form fetched successfully", data=form)


@forms_router.patch("/{form_id}", response_model=FormResponse_, status_code=status.HTTP_200_OK)
@limiter.limit("120/minute", key_func=get_user_id_or_ip)
async def update_form(
    request: Request,
    form_id: UUID,
    body: FormUpdate,
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    form_services: FormServices = Depends(get_form_services),
):
    form = await form_services.update_form(form_id=form_id, user_id=user_id, form_update=body, session=session)
    return success_response(message="Form updated", data=form)


@forms_router.delete("/{form_id}", response_model=FormDeleteResponse, status_code=status.HTTP_200_OK)
@limiter.limit("60/minute", key_func=get_user_id_or_ip)
async def delete_form(
    request: Request,
    form_id: UUID,
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    form_services: FormServices = Depends(get_form_services),
):
    result = await form_services.delete_form(form_id=form_id, user_id=user_id, session=session)
    return success_response(message="Form deleted", data=result)


@forms_router.post("/{form_id}/restore", response_model=FormResponse_, status_code=status.HTTP_200_OK)
@limiter.limit("60/minute", key_func=get_user_id_or_ip)
async def restore_form(
    request: Request,
    form_id: UUID,
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    form_services: FormServices = Depends(get_form_services),
):
    form = await form_services.restore_form(form_id=form_id, user_id=user_id, session=session)
    return success_response(message="Form restored", data=form)


@forms_router.post("/{form_id}/publish", response_model=FormResponse_, status_code=status.HTTP_200_OK)
@limiter.limit("60/minute", key_func=get_user_id_or_ip)
async def publish_form(
    request: Request,
    form_id: UUID,
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    form_services: FormServices = Depends(get_form_services),
):
    form = await form_services.publish_form(form_id=form_id, user_id=user_id, session=session)
    return success_response(message="Form published", data=form)


# ── Field routes ─────────────────────────────────────────────────────────────

@forms_router.post("/{form_id}/fields", response_model=FormFieldResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("120/minute", key_func=get_user_id_or_ip)
async def create_field(
    request: Request,
    form_id: UUID,
    body: FormFieldCreate,
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    form_services: FormServices = Depends(get_form_services),
):
    field = await form_services.create_field(form_id=form_id, user_id=user_id, field_input=body, session=session)
    return success_response(message="Field created", data=field)


@forms_router.patch("/{form_id}/fields/reorder", response_model=FormResponse_, status_code=status.HTTP_200_OK)
@limiter.limit("120/minute", key_func=get_user_id_or_ip)
async def reorder_fields(
    request: Request,
    form_id: UUID,
    body: FieldReorderBody,
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    form_services: FormServices = Depends(get_form_services),
):
    form = await form_services.reorder_fields(form_id=form_id, user_id=user_id, field_ids=body.field_ids, session=session)
    return success_response(message="Fields reordered", data=form)


@forms_router.patch("/{form_id}/fields/{field_id}", response_model=FormFieldResponse, status_code=status.HTTP_200_OK)
@limiter.limit("120/minute", key_func=get_user_id_or_ip)
async def update_field(
    request: Request,
    form_id: UUID,
    field_id: UUID,
    body: FormFieldUpdate,
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    form_services: FormServices = Depends(get_form_services),
):
    field = await form_services.update_field(form_id=form_id, field_id=field_id, user_id=user_id, field_update=body, session=session)
    return success_response(message="Field updated", data=field)


@forms_router.delete("/{form_id}/fields/{field_id}", response_model=FormDeleteResponse, status_code=status.HTTP_200_OK)
@limiter.limit("120/minute", key_func=get_user_id_or_ip)
async def delete_field(
    request: Request,
    form_id: UUID,
    field_id: UUID,
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    form_services: FormServices = Depends(get_form_services),
):
    result = await form_services.delete_field(form_id=form_id, field_id=field_id, user_id=user_id, session=session)
    return success_response(message="Field deleted", data=result)


# ── Response routes ───────────────────────────────────────────────────────────

@forms_router.get("/{form_id}/responses", response_model=ResponsesListResponse, status_code=status.HTTP_200_OK)
@limiter.limit("60/minute", key_func=get_user_id_or_ip)
async def list_responses(
    request: Request,
    form_id: UUID,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    form_services: FormServices = Depends(get_form_services),
):
    responses = await form_services.list_responses(form_id=form_id, user_id=user_id, session=session, limit=limit, offset=offset)
    return success_response(message="Responses fetched successfully", data=responses)


@forms_router.get("/{form_id}/responses/summary", response_model=ResponsesSummaryResponse, status_code=status.HTTP_200_OK)
@limiter.limit("60/minute", key_func=get_user_id_or_ip)
async def get_responses_summary(
    request: Request,
    form_id: UUID,
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    form_services: FormServices = Depends(get_form_services),
):
    summary = await form_services.get_responses_summary(form_id=form_id, user_id=user_id, session=session)
    return success_response(message="Summary fetched successfully", data=summary)


@forms_router.get("/{form_id}/responses/export", status_code=status.HTTP_200_OK)
@limiter.limit("20/minute", key_func=get_user_id_or_ip)
async def export_responses_csv(
    request: Request,
    form_id: UUID,
    fields: str = Query(default="", description="Comma-separated field UUIDs to include"),
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    form_services: FormServices = Depends(get_form_services),
):
    field_ids_filter = None
    if fields:
        try:
            field_ids_filter = [UUID(fid.strip()) for fid in fields.split(",") if fid.strip()]
        except ValueError:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="Invalid field UUID in ?fields= param")

    csv_generator = form_services.export_responses_csv_generator(
        form_id=form_id,
        user_id=user_id,
        session=session,
        field_ids_filter=field_ids_filter,
    )

    return StreamingResponse(
        csv_generator,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="form-{form_id}-responses.csv"'},
    )


@forms_router.delete("/{form_id}/responses/{response_id}", response_model=ResponseDeleteResponse, status_code=status.HTTP_200_OK)
@limiter.limit("60/minute", key_func=get_user_id_or_ip)
async def delete_response(
    request: Request,
    form_id: UUID,
    response_id: UUID,
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    form_services: FormServices = Depends(get_form_services),
):
    result = await form_services.delete_response(
        form_id=form_id,
        response_id=response_id,
        user_id=user_id,
        session=session,
    )
    return success_response(message="Response deleted successfully", data=result)


@forms_router.delete("/{form_id}/responses", response_model=BulkDeleteResponse_, status_code=status.HTTP_200_OK)
@limiter.limit("60/minute", key_func=get_user_id_or_ip)
async def bulk_delete_responses(
    request: Request,
    form_id: UUID,
    body: BulkDeleteResponsesIn,
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    form_services: FormServices = Depends(get_form_services),
):
    result = await form_services.bulk_delete_responses(
        form_id=form_id,
        response_ids=body.response_ids,
        user_id=user_id,
        session=session,
    )
    return success_response(message="Responses deleted successfully", data=result)


@forms_router.patch("/{form_id}/responses/{response_id}", response_model=EditResponseResponse, status_code=status.HTTP_200_OK)
@limiter.limit("60/minute", key_func=get_user_id_or_ip)
async def edit_response(
    request: Request,
    form_id: UUID,
    response_id: UUID,
    body: EditResponseIn,
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    form_services: FormServices = Depends(get_form_services),
):
    updated = await form_services.edit_response(
        form_id=form_id,
        response_id=response_id,
        answers_input=body.answers,
        user_id=user_id,
        session=session,
      )
    return success_response(message="Response updated", data=updated)



# ──────────────────────────────────────────────────────────────────────────────
# Public routes (no auth)
# ──────────────────────────────────────────────────────────────────────────────

@public_forms_router.get("/forms/{form_id}", response_model=PublicFormResponse, status_code=status.HTTP_200_OK)
@limiter.limit("30/minute")
async def get_public_form(
    request: Request,
    form_id: UUID,
    session: AsyncSession = Depends(get_session),
    form_services: FormServices = Depends(get_form_services),
):
    form = await form_services.get_public_form(form_id=form_id, session=session)
    return success_response(message="Form fetched successfully", data=form)


@public_forms_router.post("/forms/{form_id}/responses", response_model=SubmitResponseOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def submit_form_response(
    request: Request,
    form_id: UUID,
    body: SubmitResponseIn,
    session: AsyncSession = Depends(get_session),
    form_services: FormServices = Depends(get_form_services),
):
    result = await form_services.submit_response(form_id=form_id, submission=body, session=session)
    return success_response(message="Response submitted successfully", data=result)
