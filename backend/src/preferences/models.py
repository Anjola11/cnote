from enum import Enum
from typing import Optional, TYPE_CHECKING
import uuid
from datetime import datetime
import sqlalchemy.dialects.postgresql as pg
from sqlmodel import SQLModel, Field, Column, Relationship, UniqueConstraint
from src.utils.utc_now import utc_now

if TYPE_CHECKING:
    from src.auth.models import User

class PreferenceKey(str, Enum):
    THEME = "theme"
    # add new preference keys here as the product grows

class ThemeValue(str, Enum):
    LIGHT = "light"
    DARK = "dark"
    SYSTEM = "system"

PREFERENCE_VALUE_MAP: dict[PreferenceKey, type[Enum]] = {
    PreferenceKey.THEME: ThemeValue,
}


class UserPreference(SQLModel, table=True):
    __tablename__ = "user_preferences"
    __table_args__ = (
        UniqueConstraint("uid", "key", name="uq_user_preference_key"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    uid: uuid.UUID = Field(foreign_key="users.uid", index=True)
    key: PreferenceKey = Field(sa_column=Column(pg.VARCHAR, nullable=False))
    value: str = Field(nullable=False)
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=False),
    )

    user: Optional["User"] = Relationship(back_populates="preferences")
