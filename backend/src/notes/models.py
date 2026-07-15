
import uuid
from datetime import datetime
from enum import Enum
from typing import Optional, TYPE_CHECKING

import cloudinary
import sqlalchemy.dialects.postgresql as pg
from pydantic import computed_field
from sqlalchemy.orm import relationship
from sqlmodel import SQLModel, Column, Field, Relationship

from src.utils.utc_now import utc_now


if TYPE_CHECKING:
    from src.auth.models import User

class NoteCategory(str, Enum):
    PROGRAMMING = "programming"
    SPIRITUAL = "spiritual"
    GENERAL = "general"


class Note(SQLModel, table=True):
    __tablename__ = "notes"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    uid: uuid.UUID = Field(foreign_key="users.uid", index=True)

    category: NoteCategory
    title: Optional[str] = Field(default=None)

    content: dict = Field(default_factory=dict, sa_column=Column(pg.JSONB))
    content_text: str = Field(default="")
    word_count: int = Field(default=0)
    is_public: bool = Field(default=False, index=True)
    share_token: str | None = Field(default=None, unique=True, index=True)
    
    version: int = Field(
        default=1,
        sa_column=Column(pg.INTEGER, server_default="1", nullable=False)
    )

    deleted_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(pg.TIMESTAMP(timezone=True), index=True)
    )

    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(pg.TIMESTAMP(timezone=True), index=True, nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(pg.TIMESTAMP(timezone=True), index=True, nullable=False),
    )

    user: Optional["User"] = Relationship(
        sa_relationship=relationship("User", back_populates="notes")
    )
    

    media: list["NoteMediaUpload"] = Relationship(
        back_populates="note",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "primaryjoin": "Note.id == NoteMediaUpload.note_id",
        },
    )


class NoteMediaUpload(SQLModel, table=True):
    __tablename__ = "note_media_upload"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    note_id: uuid.UUID = Field(foreign_key="notes.id", index=True)
    user_id: uuid.UUID = Field(foreign_key="users.uid", index=True)

    cloudinary_public_id: str = Field(unique=True, index=True)
    size_bytes: int
    last_height_px: int
    last_width_px: int
    format: str

    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(pg.TIMESTAMP(timezone=True)),
    )

    note: Optional[Note] = Relationship(back_populates="media")

    @computed_field
    @property
    def url(self) -> str:
        url, _options = cloudinary.utils.cloudinary_url(
            self.cloudinary_public_id,
            width=self.last_width_px,
            height=self.last_height_px,
            format="webp",
            crop="limit",
            fetch_format="auto",
            quality="auto",
        )
        return url
