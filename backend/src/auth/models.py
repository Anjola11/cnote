from sqlmodel import SQLModel, Field, Column, Relationship
import uuid
from pydantic import EmailStr
from enum import Enum
import sqlalchemy.dialects.postgresql as pg
from datetime import datetime, timezone, timedelta
from typing import Optional
from src.utils.utc_now import utc_now


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

    password_hash: str = Field(exclude=True)
    avatar_public_id: Optional[str] 

    is_verified: bool = Field(default=False)
    is_active: bool = Field(default=True)

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