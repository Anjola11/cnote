from pydantic import BaseModel

from src.auth.schemas import AuthUserOut


class AvatarUploadOut(BaseModel):
    public_id: str
    url: str | None = None
    user: AuthUserOut


class AvatarUploadResponse(BaseModel):
    success: bool
    message: str
    data: AvatarUploadOut


class NoteImageUploadOut(BaseModel):
    public_id: str
    url: str | None = None
    size_bytes: int
    height: int
    width: int
    format: str


class NoteImageUploadResponse(BaseModel):
    success: bool
    message: str
    data: NoteImageUploadOut
