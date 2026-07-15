from fastapi import APIRouter, Depends, File, Request, UploadFile, status
from sqlmodel.ext.asyncio.session import AsyncSession

from src.auth.schemas import ProfileUpdateInput
from src.auth.services import AuthServices
from src.db.main import get_session
from src.fileUpload.main import FileUploadServices
from src.fileUpload.schemas import AvatarUploadResponse, FormLogoUploadResponse, NoteImageUploadResponse
from src.utils.dependencies import get_verified_user
from src.utils.responses import success_response
from src.limiter import get_user_id_or_ip, limiter

file_router = APIRouter()


def get_file_upload_services() -> FileUploadServices:
    return FileUploadServices()


def get_auth_services() -> AuthServices:
    return AuthServices()


@file_router.post("/avatar", response_model=AvatarUploadResponse, status_code=status.HTTP_200_OK)
@limiter.limit("20/minute", key_func=get_user_id_or_ip)
async def upload_avatar(
    request: Request,
    file: UploadFile = File(...),
    current_user=Depends(get_verified_user),
    session: AsyncSession = Depends(get_session),
    file_upload_services: FileUploadServices = Depends(get_file_upload_services),
    auth_services: AuthServices = Depends(get_auth_services),
):
    upload_result = await file_upload_services.upload_avatar(
        file=file,
        user_id=current_user.uid,
        old_avatar_id=current_user.avatar_public_id,
    )
    user = await auth_services.update_profile(
        current_user,
        ProfileUpdateInput(avatar_public_id=upload_result["public_id"]),
        session,
    )

    return success_response(
        message="Avatar uploaded successfully",
        data={
            "public_id": upload_result["public_id"],
            "url": upload_result.get("url"),
            "user": user,
        },
    )


@file_router.post("/note-image/{note_id}", response_model=NoteImageUploadResponse, status_code=status.HTTP_200_OK)
@limiter.limit("50/minute", key_func=get_user_id_or_ip)
async def upload_note_image(
    note_id: str,
    request: Request,
    file: UploadFile = File(...),
    current_user=Depends(get_verified_user),
    session: AsyncSession = Depends(get_session),
    file_upload_services: FileUploadServices = Depends(get_file_upload_services),
):
    from uuid import UUID
    from fastapi import HTTPException
    from sqlmodel import select
    from src.notes.models import Note

    try:
        note_uuid = UUID(note_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    note_result = await session.exec(
        select(Note).where(Note.id == note_uuid, Note.uid == current_user.uid, Note.deleted_at == None)
    )
    if not note_result.first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    upload_result = await file_upload_services.upload_note_image(
        file=file,
        user_id=current_user.uid,
        note_id=note_uuid,
    )

    return success_response(
        message="Image uploaded successfully",
        data=upload_result,
    )


@file_router.post("/form-logo/{form_id}", response_model=FormLogoUploadResponse, status_code=status.HTTP_200_OK)
@limiter.limit("20/minute", key_func=get_user_id_or_ip)
async def upload_form_logo(
    form_id: str,
    request: Request,
    file: UploadFile = File(...),
    current_user=Depends(get_verified_user),
    session: AsyncSession = Depends(get_session),
    file_upload_services: FileUploadServices = Depends(get_file_upload_services),
):
    from uuid import UUID
    from fastapi import HTTPException
    from sqlmodel import select
    from src.forms.models import Form

    try:
        form_uuid = UUID(form_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")

    form_result = await session.exec(
        select(Form).where(Form.id == form_uuid, Form.uid == current_user.uid, Form.deleted_at == None)
    )
    if not form_result.first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")

    upload_result = await file_upload_services.upload_form_logo(
        file=file,
        user_id=current_user.uid,
        form_id=form_id,
    )

    return success_response(
        message="Form logo uploaded successfully",
        data=upload_result,
    )
