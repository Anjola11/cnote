
from sqlmodel import SQLModel, Field, Column, Relationship
import uuid
from pydantic import EmailStr, computed_field
from enum import Enum
import sqlalchemy.dialects.postgresql as pg
from datetime import datetime, timezone, timedelta
from typing import Optional, TYPE_CHECKING
from src.utils.utc_now import utc_now
import cloudinary



if TYPE_CHECKING:
    from src.notes.models import Note

class Plan(str, Enum):
    BASIC = "basic"
    PRO = "pro"



class User(SQLModel, table=True):
    __tablename__ = "users"

    uid: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True
    )

    email: EmailStr = Field(unique=True, index=True)
    username: str
    display_name: Optional[str] = Field(default=None)
    bio: Optional[str] = Field(default=None)

    password_hash: str = Field(exclude=True)
    avatar_public_id: Optional[str] = Field(default=None)

    is_verified: bool = Field(default=False)
    is_active: bool = Field(default=True)
    session_version: int = Field(default=0)

    plan: Optional[Plan] = Field(default=Plan.BASIC)

    storage_used_bytes: Optional[int] = Field(default=0)

    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(pg.TIMESTAMP(timezone=True), index=True, nullable=False)
    )
    updated_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(pg.TIMESTAMP(timezone=True), index=True, nullable=False)
    )
    last_login_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(pg.TIMESTAMP(timezone=True), index=True, nullable=False)
    )

    @computed_field
    @property
    def profile_picture_url(self) -> str:
        if not self.avatar_public_id:
            # Use brand colors: background #f5f3ff (light purple), color #4C3A94 (dark purple)
            return f"https://ui-avatars.com/api/?name={self.username}&background=f5f3ff&color=4C3A94"
        
        url, options = cloudinary.utils.cloudinary_url(
            self.avatar_public_id,
            width=500,
            height=500,
            crop="fill",
            gravity="face",
            quality="auto",
            fetch_format="auto"
        )

        return url


    #relationship
    notes: list["Note"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "primaryjoin": "User.uid == Note.uid"}
    )


def get_expiry_time(minutes):
    return datetime.now(timezone.utc) + timedelta(minutes=minutes)

class SignupOtp(SQLModel, table=True):
    __tablename__ = "signupOtp"
    
    otp_id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    otp: str
    uid: uuid.UUID = Field(foreign_key="users.uid")
    max_attempts: int = Field(default=3)
    attempts:  int = Field(default=0)
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(pg.TIMESTAMP(timezone=True)))
    expires: datetime = Field(
        default_factory=lambda: get_expiry_time(10),
        sa_column=Column(pg.TIMESTAMP(timezone=True)))

class ForgotPasswordOtp(SQLModel, table=True):
    __tablename__ = "forgotPasswordOtp"
    
    otp_id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    otp: str
    uid: uuid.UUID = Field(foreign_key="users.uid")
    max_attempts: int = Field(default=3)
    attempts:  int = Field(default=0)
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(pg.TIMESTAMP(timezone=True)))
    expires: datetime = Field(
        default_factory=lambda: get_expiry_time(10),
        sa_column=Column(pg.TIMESTAMP(timezone=True)))
