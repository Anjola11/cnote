from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile, status
from sqlmodel.ext.asyncio.session import AsyncSession

from src.db.main import get_session
from src.fileUpload.main import FileUploadServices
from src.notes.models import NoteCategory
from src.notes.schemas import (
    DeletedNotesListResponse,
    NoteDeleteResponse,
    NoteContentUpdateBody,
    NoteCreateInput,
    NoteCreateResponse,
    NoteMediaUploadResponse,
    NoteResponse,
    NoteShareResponse,
    NoteShareUpdateBody,
    NotesListResponse,
    PublicNoteResponse,
    NoteTitleUpdateBody,
)
from src.notes.services import NoteServices
from src.utils.dependencies import get_verified_user_id
from src.utils.responses import success_response
from src.limiter import get_user_id_or_ip, limiter

notes_router = APIRouter()
public_notes_router = APIRouter()


def get_note_services() -> NoteServices:
    return NoteServices()


def get_file_upload_services() -> FileUploadServices:
    return FileUploadServices()


@notes_router.post("/", response_model=NoteCreateResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("120/minute", key_func=get_user_id_or_ip)
async def create_note(
    request: Request,
    note_input: NoteCreateInput,
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    note_services: NoteServices = Depends(get_note_services),
):
    note = await note_services.create_note(user_id=user_id, note_input=note_input, session=session)
    return success_response(message="Note created", data=note)


@notes_router.get("/", response_model=NotesListResponse, status_code=status.HTTP_200_OK)
@limiter.limit("60/minute", key_func=get_user_id_or_ip)
async def list_notes(
    request: Request,
    category: NoteCategory | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    note_services: NoteServices = Depends(get_note_services),
):
    notes = await note_services.list_notes(
        user_id=user_id,
        session=session,
        category=category,
        limit=limit,
        offset=offset,
    )
    
    return success_response(message="Notes fetched successfully", data=notes)


@notes_router.get("/bin", response_model=DeletedNotesListResponse, status_code=status.HTTP_200_OK)
@limiter.limit("60/minute", key_func=get_user_id_or_ip)
async def list_deleted_notes(
    request: Request,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    note_services: NoteServices = Depends(get_note_services),
):
    notes = await note_services.list_deleted_notes(
        user_id=user_id,
        session=session,
        limit=limit,
        offset=offset,
    )
    return success_response(message="Deleted notes fetched successfully", data=notes)


@notes_router.get("/{note_id}", response_model=NoteResponse, status_code=status.HTTP_200_OK)
@limiter.limit("120/minute", key_func=get_user_id_or_ip)
async def get_note(
    request: Request,
    note_id: UUID,
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    note_services: NoteServices = Depends(get_note_services),
):
    note = await note_services.get_note(note_id=note_id, user_id=user_id, session=session)
    return success_response(message="Note fetched successfully", data=note)


@notes_router.patch("/{note_id}/title", response_model=NoteResponse, status_code=status.HTTP_200_OK)
@limiter.limit("120/minute", key_func=get_user_id_or_ip)
async def update_note_title(
    request: Request,
    note_id: UUID,
    body: NoteTitleUpdateBody,
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    note_services: NoteServices = Depends(get_note_services),
):
    note = await note_services.update_note_title(
        note_id=note_id,
        user_id=user_id,
        title=body.title,
        session=session
    )
    return success_response(message="Note title updated", data=note)


@notes_router.patch("/{note_id}/content", response_model=NoteResponse, status_code=status.HTTP_200_OK)
@limiter.limit("60/minute", key_func=get_user_id_or_ip)
async def update_note_content(
    request: Request,
    note_id: UUID,
    body: NoteContentUpdateBody,
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    note_services: NoteServices = Depends(get_note_services),
):
    note = await note_services.update_note_content(
        note_id=note_id,
        user_id=user_id,
        content=body.content,
        session=session
    )
    return success_response(message="Note content updated", data=note)


@notes_router.delete("/{note_id}", response_model=NoteDeleteResponse, status_code=status.HTTP_200_OK)
@limiter.limit("120/minute", key_func=get_user_id_or_ip)
async def delete_note(
    request: Request,
    note_id: UUID,
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    note_services: NoteServices = Depends(get_note_services),
):
    result = await note_services.delete_note(note_id=note_id, user_id=user_id, session=session)
    return success_response(message="Note deleted", data=result)


@notes_router.post("/{note_id}/media", response_model=NoteMediaUploadResponse, status_code=status.HTTP_200_OK)
@limiter.limit("20/minute", key_func=get_user_id_or_ip)
async def upload_note_media(
    request: Request,
    note_id: UUID,
    file: UploadFile = File(...),
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    note_services: NoteServices = Depends(get_note_services),
    file_upload_services: FileUploadServices = Depends(get_file_upload_services),
):
    result = await note_services.upload_note_media(
        note_id=note_id,
        user_id=user_id,
        file=file,
        session=session,
        file_upload_services=file_upload_services,
    )
    return success_response(message="Note image uploaded successfully", data=result)


@notes_router.delete(
    "/{note_id}/media/{public_id:path}",
    response_model=NoteDeleteResponse,
    status_code=status.HTTP_200_OK,
)
@limiter.limit("120/minute", key_func=get_user_id_or_ip)
async def delete_note_media(
    request: Request,
    note_id: UUID,
    public_id: str,
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    note_services: NoteServices = Depends(get_note_services),
    file_upload_services: FileUploadServices = Depends(get_file_upload_services),
):
    result = await note_services.delete_note_media(
        note_id=note_id,
        user_id=user_id,
        public_id=public_id,
        session=session,
        file_upload_services=file_upload_services,
    )
    return success_response(message="Note image deleted", data=result)


@notes_router.patch("/{note_id}/share", response_model=NoteShareResponse, status_code=status.HTTP_200_OK)
@limiter.limit("120/minute", key_func=get_user_id_or_ip)
async def update_note_share(
    request: Request,
    note_id: UUID,
    body: NoteShareUpdateBody,
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    note_services: NoteServices = Depends(get_note_services),
):
    result = await note_services.update_note_share(
        note_id=note_id,
        user_id=user_id,
        is_public=body.is_public,
        session=session,
    )
    return success_response(message="Note share settings updated", data=result)


@notes_router.post("/{note_id}/restore", response_model=NoteResponse, status_code=status.HTTP_200_OK)
@limiter.limit("120/minute", key_func=get_user_id_or_ip)
async def restore_note(
    request: Request,
    note_id: UUID,
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    note_services: NoteServices = Depends(get_note_services),
):
    note = await note_services.restore_note(note_id=note_id, user_id=user_id, session=session)
    return success_response(message="Note restored", data=note)


@public_notes_router.get("/notes/{share_token}", response_model=PublicNoteResponse, status_code=status.HTTP_200_OK)
@limiter.limit("30/minute")
async def get_public_note(
    request: Request,
    share_token: str,
    session: AsyncSession = Depends(get_session),
    note_services: NoteServices = Depends(get_note_services),
):
    result = await note_services.get_public_note(share_token=share_token, session=session)
    return success_response(message="Public note fetched successfully", data=result)
