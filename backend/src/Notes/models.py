from sqlmodel import SQLModel, Field, Column, Relationship
import uuid
from datetime import datetime
import sqlalchemy.dialects.postgresql as pg
from src.utils.utc_now import utc_now
from typing import Optional


class Note(SQLModel, table=True):
    __tablename__ = "notes"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    uid: uuid.UUID = Field(foreign_key="users.uid", index=True)
    title: Optional[str] = Field(default=None)
    content: dict = Field(default_factory=dict, sa_column=Column(pg.JSONB))
    content_text: str = Field(default="")
    word_count: int = Field(default=0)
    deleted_at: Optional[datetime] = Field(
        default=None
    )
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(pg.TIMESTAMP(timezone=True), index=True, nullable=False)
    )
    updated_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(pg.TIMESTAMP(timezone=True), index=True, nullable=False)
    )

    #relationship

    user: Optional["User"] = Relationship(
        back_populates="notes"
    )

    media: list["NoteMediaUpload"] = Relationship(
        back_populates="note",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "primaryjoin": "Note.id == NoteMediaUpload.note_id"}
    )

    
