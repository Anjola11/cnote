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
