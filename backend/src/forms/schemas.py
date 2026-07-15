from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from src.forms.models import FormFieldType, FormLayoutType


# ─── Field Schemas ───────────────────────────────────────────────────────────

class FormFieldCreate(BaseModel):
    type: FormFieldType
    label: str = ""
    is_required: bool = False
    options: Optional[list[str]] = None
    allow_other: bool = False
    page: int = 0


class FormFieldUpdate(BaseModel):
    label: Optional[str] = None
    is_required: Optional[bool] = None
    options: Optional[list[str]] = None
    allow_other: Optional[bool] = None
    page: Optional[int] = None
    type: Optional[FormFieldType] = None


class FormFieldOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    form_id: UUID
    order: int
    page: int
    type: FormFieldType
    label: str
    is_required: bool
    options: Optional[list[str]] = None
    allow_other: bool


class FieldReorderBody(BaseModel):
    field_ids: list[UUID]


# ─── Form Schemas ─────────────────────────────────────────────────────────────

class FormCreate(BaseModel):
    title: str = "Untitled Form"
    description: Optional[str] = None
    layout_type: FormLayoutType = FormLayoutType.SINGLE_PAGE


class FormUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    background_config: Optional[dict] = None
    layout_type: Optional[FormLayoutType] = None
    accepts_responses: Optional[bool] = None
    closes_at: Optional[datetime] = None


class FormOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    uid: UUID
    title: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    background_config: dict
    layout_type: FormLayoutType
    is_published: bool
    accepts_responses: bool
    closes_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    fields: list[FormFieldOut] = []


class FormListItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: Optional[str] = None
    layout_type: FormLayoutType
    is_published: bool
    accepts_responses: bool
    closes_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    response_count: int = 0


class DeletedFormListItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    is_published: bool
    deleted_at: datetime
    created_at: datetime
    updated_at: datetime


# ─── Response Schemas ─────────────────────────────────────────────────────────

class AnswerIn(BaseModel):
    field_id: UUID
    value: Any  # string | list[str]


class SubmitResponseIn(BaseModel):
    answers: list[AnswerIn]
    idempotency_key: str | None = None


class AnswerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    field_id: UUID
    value: Any


class FormResponseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    form_id: UUID
    submitted_at: datetime
    answers: list[AnswerOut] = []


class ResponseSummaryFieldOut(BaseModel):
    field_id: UUID
    label: str
    type: str
    tally: Optional[dict[str, int]] = None  # option → count, for choice fields
    text_count: Optional[int] = None  # for text fields


# ─── Public Form Schema ───────────────────────────────────────────────────────

class PublicFormOut(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    background_config: dict
    layout_type: FormLayoutType
    fields: list[FormFieldOut]


# ─── Generic API response wrappers ───────────────────────────────────────────

class FormResponse_(BaseModel):
    success: bool
    message: str
    data: FormOut


class FormsListResponse(BaseModel):
    success: bool
    message: str
    data: list[FormListItemOut]


class DeletedFormsListResponse(BaseModel):
    success: bool
    message: str
    data: list[DeletedFormListItemOut]


class FormFieldResponse(BaseModel):
    success: bool
    message: str
    data: FormFieldOut


class FormDeleteResponse(BaseModel):
    success: bool
    message: str
    data: dict[str, str]


class SubmitResponseOut(BaseModel):
    success: bool
    message: str
    data: dict[str, str]


class ResponsesListResponse(BaseModel):
    success: bool
    message: str
    data: list[FormResponseOut]


class ResponsesSummaryResponse(BaseModel):
    success: bool
    message: str
    data: list[ResponseSummaryFieldOut]


class PublicFormResponse(BaseModel):
    success: bool
    message: str
    data: PublicFormOut


class EditResponseIn(BaseModel):
    answers: list[AnswerIn]


class BulkDeleteResponsesIn(BaseModel):
    response_ids: list[UUID]


class BulkDeleteResponse_(BaseModel):
    success: bool
    message: str
    data: dict[str, int]


class ResponseDeleteResponse(BaseModel):
    success: bool
    message: str
    data: dict[str, str]


class EditResponseResponse(BaseModel):
    success: bool
    message: str
    data: FormResponseOut

