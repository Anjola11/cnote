from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator

from src.notes.models import NoteCategory


class NoteCreateInput(BaseModel):
    title: str | None = None
    content: dict = {}
    category: NoteCategory


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    uid: UUID
    category: NoteCategory
    title: str | None = None
    content: dict
    content_text: str
    word_count: int
    is_public: bool
    share_token: str | None = None
    version: int
    created_at: datetime
    updated_at: datetime


class NoteListItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    category: NoteCategory
    title: str | None = None
    word_count: int
    content_text: str
    is_public: bool
    created_at: datetime
    updated_at: datetime

    @field_validator("content_text", mode="before")
    @classmethod
    def truncate_content(cls, v):
        if v and isinstance(v, str):
            return v[:150]
        return v or ""


class NoteCreateResponse(BaseModel):
    success: bool
    message: str
    data: NoteOut


class NotesListResponse(BaseModel):
    success: bool
    message: str
    data: list[NoteListItemOut]


class DeletedNoteListItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    category: NoteCategory
    title: str | None = None
    word_count: int
    content_text: str
    is_public: bool
    deleted_at: datetime
    created_at: datetime
    updated_at: datetime

    @field_validator("content_text", mode="before")
    @classmethod
    def truncate_content(cls, v):
        if v and isinstance(v, str):
            return v[:150]
        return v or ""


class DeletedNotesListResponse(BaseModel):
    success: bool
    message: str
    data: list[DeletedNoteListItemOut]


class NoteResponse(BaseModel):
    success: bool
    message: str
    data: NoteOut


class NoteTitleUpdateBody(BaseModel):
    title: str | None = None


class NoteContentUpdateBody(BaseModel):
    content: dict
    version: int | None = None


class NoteDeleteResponse(BaseModel):
    success: bool
    message: str
    data: dict[str, str]


class NoteMediaOut(BaseModel):
    public_id: str
    url: str


class NoteMediaUploadResponse(BaseModel):
    success: bool
    message: str
    data: NoteMediaOut


class NoteShareUpdateBody(BaseModel):
    is_public: bool


class NoteShareOut(BaseModel):
    id: UUID
    is_public: bool
    share_token: str | None = None


class NoteShareResponse(BaseModel):
    success: bool
    message: str
    data: NoteShareOut


class PublicNoteOut(BaseModel):
    title: str | None = None
    content: dict
    category: NoteCategory
    created_at: datetime
    word_count: int
    display_name: str | None = None
    avatar_url: str | None = None


class PublicNoteMetaOut(BaseModel):
    title: str | None = None
    excerpt: str | None = None
    coverImageUrl: str | None = None


class PublicNoteMetaResponse(BaseModel):
    success: bool
    message: str
    data: PublicNoteMetaOut


class PublicNoteResponse(BaseModel):
    success: bool
    message: str
    data: PublicNoteOut
