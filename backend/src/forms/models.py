import uuid
from datetime import datetime
from enum import Enum
from typing import Optional, TYPE_CHECKING, List

import sqlalchemy.dialects.postgresql as pg
from sqlmodel import SQLModel, Column, Field, Relationship

from src.utils.utc_now import utc_now


if TYPE_CHECKING:
    from src.auth.models import User


class FormLayoutType(str, Enum):
    SINGLE_PAGE = "single_page"
    MULTI_PAGE = "multi_page"


class FormFieldType(str, Enum):
    SHORT_ANSWER = "short_answer"
    LONG_ANSWER = "long_answer"
    MULTIPLE_CHOICE_SINGLE = "multiple_choice_single"
    MULTIPLE_CHOICE_MULTI = "multiple_choice_multi"
    EMAIL = "email"
    PHONE = "phone"


class Form(SQLModel, table=True):
    __tablename__ = "forms"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    uid: uuid.UUID = Field(foreign_key="users.uid", index=True)

    title: str = Field(default="Untitled Form")
    description: Optional[str] = Field(default=None)
    logo_url: Optional[str] = Field(default=None)

    background_config: dict = Field(
        default_factory=lambda: {"type": "color", "value": "#fafaf8"},
        sa_column=Column(pg.JSONB),
    )

    layout_type: FormLayoutType = Field(default=FormLayoutType.SINGLE_PAGE)
    is_published: bool = Field(default=False, index=True)
    accepts_responses: bool = Field(default=True)

    closes_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(pg.TIMESTAMP(timezone=True)),
    )

    deleted_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(pg.TIMESTAMP(timezone=True), index=True),
    )

    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(pg.TIMESTAMP(timezone=True), index=True, nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(pg.TIMESTAMP(timezone=True), index=True, nullable=False),
    )

    # Relationships
    fields: List["FormField"] = Relationship(
        back_populates="form",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "primaryjoin": "Form.id == FormField.form_id",
            "order_by": "FormField.order",
        },
    )
    responses: List["FormResponse"] = Relationship(
        back_populates="form",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "primaryjoin": "Form.id == FormResponse.form_id",
        },
    )


class FormField(SQLModel, table=True):
    __tablename__ = "form_fields"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    form_id: uuid.UUID = Field(foreign_key="forms.id", index=True)

    order: int = Field(default=0)
    page: int = Field(default=0)
    type: FormFieldType
    label: str = Field(default="")
    is_required: bool = Field(default=False)

    options: Optional[list] = Field(
        default=None,
        sa_column=Column(pg.JSONB),
    )
    allow_other: bool = Field(default=False)

    form: Optional[Form] = Relationship(back_populates="fields")
    answers: List["FormAnswer"] = Relationship(
        back_populates="field",
        sa_relationship_kwargs={
            "primaryjoin": "FormField.id == FormAnswer.field_id",
            "cascade": "all, delete-orphan",
        },
    )


class FormResponse(SQLModel, table=True):
    __tablename__ = "form_responses"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    form_id: uuid.UUID = Field(foreign_key="forms.id", index=True)

    submitted_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(pg.TIMESTAMP(timezone=True), index=True, nullable=False),
    )

    form: Optional[Form] = Relationship(back_populates="responses")
    answers: List["FormAnswer"] = Relationship(
        back_populates="response",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "primaryjoin": "FormResponse.id == FormAnswer.response_id",
        },
    )


class FormAnswer(SQLModel, table=True):
    __tablename__ = "form_answers"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    response_id: uuid.UUID = Field(foreign_key="form_responses.id", index=True)
    field_id: uuid.UUID = Field(foreign_key="form_fields.id", index=True)

    # string for short/long/email/phone, single string for single-select,
    # array of strings for multi-select
    value: Optional[object] = Field(
        default=None,
        sa_column=Column(pg.JSONB),
    )

    response: Optional[FormResponse] = Relationship(back_populates="answers")
    field: Optional[FormField] = Relationship(back_populates="answers")
