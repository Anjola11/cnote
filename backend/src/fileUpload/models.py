from sqlmodel import SQLModel, Field, Column, Relationship
import uuid
from datetime import datetime
import sqlalchemy.dialects.postgresql as pg
from src.utils.utc_now import utc_now
import cloudinary
from pydantic import computed_field
from typing import Optional

class NoteMediaUpload(SQLModel, table=True):

    __tablename__ = "note_media_upload"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    note_id: uuid.UUID = Field(foreign_key="notes.id")
    cloudinary_public_id: str = Field(unique=True, index=True)
    size_bytes: int
    last_height_px: int
    last_Width_px: int
    created_at: datetime = Field(
        default_factory= utc_now,
        sa_column=Column(pg.TIMESTAMP(timezone=True))
    )

    #relationship

    note: Optional["Note"] = Relationship(
        back_populates="media"
    )

    @computed_field
    @property
    def get_url(self) -> str:
       
        url, options = cloudinary.utils.cloudinary_url(
            self.cloudinary_public_id,
            width=self.last_Width_px,
            height=self.last_height_px,
            format="webp",
            crop="limit",
            fetch_format="auto",
            quality="auto"
            )
            
             
        return url

