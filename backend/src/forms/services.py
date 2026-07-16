import csv
import io
import re
from typing import Any, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import selectinload
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from src.forms.models import Form, FormAnswer, FormField, FormFieldType, FormResponse
from src.forms.schemas import (
    AnswerIn,
    DateFieldConfig,
    FormCreate,
    FormFieldCreate,
    FormFieldUpdate,
    FormUpdate,
    SubmitResponseIn,
)
from src.utils.logger import logger
from src.utils.utc_now import utc_now

# Simple email regex
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
# Permissive phone: digits, spaces, hyphens, parens, +
_PHONE_RE = re.compile(r"^[\d\s\-().+]{7,20}$")


def _format_human_date(val: str) -> str:
    if not val:
        return ""
    months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]
    if val.startswith("--"):
        try:
            m = int(val[2:4])
            d = int(val[5:7])
            if 1 <= m <= 12:
                return f"{months[m - 1]} {d}"
        except ValueError:
            pass
    else:
        parts = val.split("-")
        if len(parts) == 3:
            try:
                y = int(parts[0])
                m = int(parts[1])
                d = int(parts[2])
                if 1 <= m <= 12:
                    return f"{months[m - 1]} {d}, {y}"
            except ValueError:
                pass
    return val


class FormServices:

    # ── Internal helpers ──────────────────────────────────────────────────────

    async def _get_form(self, form_id: UUID, user_id: UUID, session: AsyncSession) -> Form:
        result = await session.exec(
            select(Form).where(
                Form.id == form_id,
                Form.uid == user_id,
                Form.deleted_at == None,
            )
        )
        form = result.first()
        if not form:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Form not found",
            )
        return form

    async def _get_form_with_fields(self, form_id: UUID, user_id: UUID, session: AsyncSession) -> Form:
        result = await session.exec(
            select(Form)
            .options(selectinload(Form.fields))
            .where(
                Form.id == form_id,
                Form.uid == user_id,
                Form.deleted_at == None,
            )
        )
        form = result.first()
        if not form:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Form not found",
            )
        return form

    async def _get_field(self, field_id: UUID, form_id: UUID, session: AsyncSession) -> FormField:
        result = await session.exec(
            select(FormField).where(
                FormField.id == field_id,
                FormField.form_id == form_id,
            )
        )
        field = result.first()
        if not field:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Field not found",
            )
        return field

    # ── Form CRUD ─────────────────────────────────────────────────────────────

    async def create_form(self, *, user_id: UUID, form_input: FormCreate, session: AsyncSession) -> Form:
        new_form = Form(
            uid=user_id,
            title=form_input.title,
            description=form_input.description,
            layout_type=form_input.layout_type,
        )
        try:
            session.add(new_form)
            await session.commit()
            # Re-fetch with fields eagerly loaded — avoids the greenlet async lazy-load error
            result = await session.exec(
                select(Form).options(selectinload(Form.fields)).where(Form.id == new_form.id)
            )
            form = result.first()
            logger.info(f"Created form {form.id} for user {user_id}")
            return form
        except Exception as e:
            await session.rollback()
            logger.error(f"Error creating form: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error",
            )

    async def list_forms(self, *, user_id: UUID, session: AsyncSession, limit: int = 50, offset: int = 0) -> list:
        # Get forms
        forms_result = await session.exec(
            select(Form)
            .where(Form.uid == user_id, Form.deleted_at == None)
            .order_by(Form.updated_at.desc())
            .offset(offset)
            .limit(limit)
        )
        forms = forms_result.all()

        # Get response counts for each form
        form_ids = [f.id for f in forms]
        if not form_ids:
            return []

        count_result = await session.exec(
            select(FormResponse.form_id, func.count(FormResponse.id).label("cnt"))
            .where(FormResponse.form_id.in_(form_ids))
            .group_by(FormResponse.form_id)
        )
        count_map = {row.form_id: row.cnt for row in count_result.all()}

        out = []
        for f in forms:
            out.append({
                "id": f.id,
                "title": f.title,
                "description": f.description,
                "layout_type": f.layout_type,
                "is_published": f.is_published,
                "accepts_responses": f.accepts_responses,
                "closes_at": f.closes_at,
                "created_at": f.created_at,
                "updated_at": f.updated_at,
                "response_count": count_map.get(f.id, 0),
            })
        return out

    async def list_deleted_forms(self, *, user_id: UUID, session: AsyncSession) -> list[Form]:
        result = await session.exec(
            select(Form)
            .where(Form.uid == user_id, Form.deleted_at != None)
            .order_by(Form.deleted_at.desc())
        )
        return result.all()

    async def get_form(self, *, form_id: UUID, user_id: UUID, session: AsyncSession) -> Form:
        return await self._get_form_with_fields(form_id, user_id, session)

    async def update_form(self, *, form_id: UUID, user_id: UUID, form_update: FormUpdate, session: AsyncSession) -> Form:
        form = await self._get_form_with_fields(form_id, user_id, session)

        update_data = form_update.model_dump(exclude_unset=True)
        for key, val in update_data.items():
            setattr(form, key, val)
        form.updated_at = utc_now()

        try:
            session.add(form)
            await session.commit()
            # Re-fetch with fields — never touch relationship attrs after commit
            result = await session.exec(
                select(Form)
                .options(selectinload(Form.fields))
                .where(Form.id == form.id)
            )
            return result.first()
        except Exception as e:
            await session.rollback()
            logger.error(f"Error updating form {form_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error",
            )

    async def delete_form(self, *, form_id: UUID, user_id: UUID, session: AsyncSession) -> dict:
        form = await self._get_form(form_id, user_id, session)
        form.deleted_at = utc_now()

        try:
            session.add(form)
            await session.commit()
            logger.info(f"Soft-deleted form {form.id}")
            return {"detail": "Form deleted"}
        except Exception as e:
            await session.rollback()
            logger.error(f"Error deleting form {form_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error",
            )

    async def restore_form(self, *, form_id: UUID, user_id: UUID, session: AsyncSession) -> Form:
        result = await session.exec(
            select(Form)
            .options(selectinload(Form.fields))
            .where(Form.id == form_id, Form.uid == user_id)
        )
        form = result.first()
        if not form:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Form not found",
            )

        form.deleted_at = None
        form.updated_at = utc_now()

        try:
            session.add(form)
            await session.commit()
            result = await session.exec(
                select(Form).options(selectinload(Form.fields)).where(Form.id == form_id)
            )
            return result.first()
        except Exception as e:
            await session.rollback()
            logger.error(f"Error restoring form {form_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error",
            )

    async def publish_form(self, *, form_id: UUID, user_id: UUID, session: AsyncSession) -> Form:
        form = await self._get_form_with_fields(form_id, user_id, session)
        form.is_published = True
        form.updated_at = utc_now()

        try:
            session.add(form)
            await session.commit()
            result = await session.exec(
                select(Form).options(selectinload(Form.fields)).where(Form.id == form.id)
            )
            return result.first()
        except Exception as e:
            await session.rollback()
            logger.error(f"Error publishing form {form_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error",
            )

    # ── Field CRUD ────────────────────────────────────────────────────────────

    def _validate_date_config(self, type_val: Any, date_config: Optional[dict]) -> None:
        if type_val != FormFieldType.DATE or not date_config:
            return
        
        include_year = date_config.get("include_year", True)
        min_date = date_config.get("min_date")
        max_date = date_config.get("max_date")

        import re
        full_date_re = re.compile(r"^\d{4}-\d{2}-\d{2}$")
        no_year_re = re.compile(r"^--\d{2}-\d{2}$")

        if include_year:
            if min_date and not full_date_re.match(min_date):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="min_date must match YYYY-MM-DD format when include_year is true"
                )
            if max_date and not full_date_re.match(max_date):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="max_date must match YYYY-MM-DD format when include_year is true"
                )
        else:
            if min_date and not no_year_re.match(min_date):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="min_date must match --MM-DD format when include_year is false"
                )
            if max_date and not no_year_re.match(max_date):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="max_date must match --MM-DD format when include_year is false"
                )

    async def create_field(self, *, form_id: UUID, user_id: UUID, field_input: FormFieldCreate, session: AsyncSession) -> FormField:
        form = await self._get_form(form_id, user_id, session)

        # Determine next order value
        count_result = await session.exec(
            select(func.count(FormField.id)).where(FormField.form_id == form.id)
        )
        field_count = count_result.one()

        config_dict = field_input.date_config.model_dump() if field_input.date_config else None
        self._validate_date_config(field_input.type, config_dict)

        new_field = FormField(
            form_id=form.id,
            order=field_count,
            page=field_input.page,
            type=field_input.type,
            label=field_input.label,
            is_required=field_input.is_required,
            options=field_input.options,
            allow_other=field_input.allow_other,
            date_config=config_dict,
        )

        try:
            session.add(new_field)
            form.updated_at = utc_now()
            session.add(form)
            await session.commit()
            await session.refresh(new_field)
            logger.info(f"Created field {new_field.id} on form {form_id}")
            return new_field
        except Exception as e:
            await session.rollback()
            logger.error(f"Error creating field on form {form_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error",
            )

    async def update_field(self, *, form_id: UUID, field_id: UUID, user_id: UUID, field_update: FormFieldUpdate, session: AsyncSession) -> FormField:
        await self._get_form(form_id, user_id, session)
        field = await self._get_field(field_id, form_id, session)

        update_data = field_update.model_dump(exclude_unset=True)

        merged_type = update_data.get("type", field.type)
        if "date_config" in update_data:
            new_config = field_update.date_config
            if new_config is not None:
                if not isinstance(new_config, DateFieldConfig):
                    raise TypeError(f"Expected DateFieldConfig, got {type(new_config)}")
                # Merge incoming config with existing config using Pydantic models
                existing_config = DateFieldConfig(**(field.date_config or {}))
                incoming_config_data = new_config.model_dump(exclude_unset=True)
                merged_config = existing_config.model_copy(update=incoming_config_data)
                
                # Update our update_data dictionary
                update_data["date_config"] = merged_config.model_dump()
                merged_config_dict = update_data["date_config"]
            else:
                update_data["date_config"] = None
                merged_config_dict = None
        else:
            merged_config_dict = field.date_config

        self._validate_date_config(merged_type, merged_config_dict)
        
        if "type" in update_data and update_data["type"] != field.type:
            from sqlmodel import select, func
            from src.forms.models import FormAnswer
            answers_count_result = await session.exec(
                select(func.count(FormAnswer.id)).where(FormAnswer.field_id == field.id)
            )
            answers_count = answers_count_result.one()
            if answers_count > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot change field type because this form has already collected responses for this field. Please create a new field instead."
                )

        for key, val in update_data.items():
            setattr(field, key, val)

        try:
            session.add(field)
            await session.commit()
            await session.refresh(field)
            return field
        except Exception as e:
            await session.rollback()
            logger.error(f"Error updating field {field_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error",
            )

    async def delete_field(self, *, form_id: UUID, field_id: UUID, user_id: UUID, session: AsyncSession) -> dict:
        await self._get_form(form_id, user_id, session)
        field = await self._get_field(field_id, form_id, session)

        try:
            await session.delete(field)
            await session.commit()
            logger.info(f"Deleted field {field_id} from form {form_id}")
            return {"detail": "Field deleted"}
        except Exception as e:
            await session.rollback()
            logger.error(f"Error deleting field {field_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error",
            )

    async def reorder_fields(self, *, form_id: UUID, user_id: UUID, field_ids: list[UUID], session: AsyncSession) -> Form:
        form = await self._get_form_with_fields(form_id, user_id, session)

        existing_ids = {f.id for f in form.fields}
        for fid in field_ids:
            if fid not in existing_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Field {fid} does not belong to this form",
                )

        # Build id→field map
        field_map = {f.id: f for f in form.fields}
        for idx, fid in enumerate(field_ids):
            field_map[fid].order = idx
            session.add(field_map[fid])

        form.updated_at = utc_now()
        session.add(form)

        try:
            await session.commit()
            result = await session.exec(
                select(Form).options(selectinload(Form.fields)).where(Form.id == form_id)
            )
            return result.first()
        except Exception as e:
            await session.rollback()
            logger.error(f"Error reordering fields for form {form_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error",
            )

    # ── Responses ─────────────────────────────────────────────────────────────

    async def list_responses(
        self,
        *,
        form_id: UUID,
        user_id: UUID,
        session: AsyncSession,
        limit: int = 50,
        offset: int = 0,
    ) -> list[FormResponse]:
        await self._get_form(form_id, user_id, session)

        result = await session.exec(
            select(FormResponse)
            .options(selectinload(FormResponse.answers))
            .where(FormResponse.form_id == form_id)
            .order_by(FormResponse.submitted_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return result.all()

    async def get_responses_summary(self, *, form_id: UUID, user_id: UUID, session: AsyncSession) -> list[dict]:
        form = await self._get_form_with_fields(form_id, user_id, session)

        field_ids = [f.id for f in form.fields]
        if not field_ids:
            return []

        from sqlalchemy import text

        # Query 1: Total answer counts for each field
        count_result = await session.execute(
            text("""
                SELECT field_id, COUNT(*) as total_cnt
                FROM form_answers
                WHERE field_id = ANY(:field_ids) AND value IS NOT NULL
                GROUP BY field_id
            """),
            {"field_ids": field_ids}
        )
        total_counts = {row.field_id: row.total_cnt for row in count_result.fetchall()}

        # Query 2: Option tallies for choice fields (groups text/array JSONB values)
        tally_result = await session.execute(
            text("""
                SELECT field_id, val, COUNT(*) as cnt
                FROM form_answers,
                LATERAL (
                    SELECT jsonb_array_elements_text(value) as val 
                    WHERE jsonb_typeof(value) = 'array'
                    UNION ALL
                    SELECT value#>>'{}' 
                    WHERE jsonb_typeof(value) != 'array' AND value IS NOT NULL
                ) x
                WHERE field_id = ANY(:field_ids)
                GROUP BY field_id, val
            """),
            {"field_ids": field_ids}
        )
        
        from collections import defaultdict
        tallies: dict[UUID, dict[str, int]] = defaultdict(dict)
        for row in tally_result.fetchall():
            tallies[row.field_id][row.val] = row.cnt

        summary = []
        choice_types = {
            FormFieldType.MULTIPLE_CHOICE_SINGLE,
            FormFieldType.MULTIPLE_CHOICE_MULTI,
        }

        for field in sorted(form.fields, key=lambda f: f.order):
            if field.type in choice_types:
                summary.append({
                    "field_id": field.id,
                    "label": field.label,
                    "type": field.type.value,
                    "tally": tallies.get(field.id, {}),
                    "text_count": None,
                })
            else:
                summary.append({
                    "field_id": field.id,
                    "label": field.label,
                    "type": field.type.value,
                    "tally": None,
                    "text_count": total_counts.get(field.id, 0),
                })

        return summary

    async def export_responses_csv(
        self,
        *,
        form_id: UUID,
        user_id: UUID,
        session: AsyncSession,
        field_ids_filter: Optional[list[UUID]] = None,
    ) -> str:
        # Keep this for backward compatibility or direct calls
        form = await self._get_form_with_fields(form_id, user_id, session)

        if field_ids_filter:
            fields = [f for f in form.fields if f.id in set(field_ids_filter)]
            fields = sorted(fields, key=lambda f: f.order)
        else:
            fields = sorted(form.fields, key=lambda f: f.order)

        responses_result = await session.exec(
            select(FormResponse)
            .options(selectinload(FormResponse.answers))
            .where(FormResponse.form_id == form_id)
            .order_by(FormResponse.submitted_at.asc())
        )
        responses = responses_result.all()

        output = io.StringIO()
        writer = csv.writer(output)

        header = ["Response ID", "Submitted At"] + [f.label or f"Field {i+1}" for i, f in enumerate(fields)]
        writer.writerow(header)

        for resp in responses:
            answers_map = {a.field_id: a.value for a in resp.answers}
            row = [str(resp.id), resp.submitted_at.isoformat()]
            for field in fields:
                val = answers_map.get(field.id, "")
                if isinstance(val, list):
                    val = "; ".join(str(v) for v in val)
                elif val is None:
                    val = ""
                row.append(str(val))
            writer.writerow(row)

        return output.getvalue()

    async def export_responses_csv_generator(
        self,
        *,
        form_id: UUID,
        user_id: UUID,
        session: AsyncSession,
        field_ids_filter: Optional[list[UUID]] = None,
    ):
        form = await self._get_form_with_fields(form_id, user_id, session)

        if field_ids_filter:
            fields = [f for f in form.fields if f.id in set(field_ids_filter)]
            fields = sorted(fields, key=lambda f: f.order)
        else:
            fields = sorted(form.fields, key=lambda f: f.order)

        output = io.StringIO()
        writer = csv.writer(output)

        header = ["Response ID", "Submitted At"] + [f.label or f"Field {i+1}" for i, f in enumerate(fields)]
        writer.writerow(header)
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        batch_size = 500
        offset = 0
        while True:
            statement = (
                select(FormResponse)
                .options(selectinload(FormResponse.answers))
                .where(FormResponse.form_id == form_id)
                .order_by(FormResponse.submitted_at.asc())
                .offset(offset)
                .limit(batch_size)
            )
            result = await session.exec(statement)
            responses = result.all()
            if not responses:
                break

            for resp in responses:
                answers_map = {a.field_id: a.value for a in resp.answers}
                row = [str(resp.id), resp.submitted_at.isoformat()]
                for field in fields:
                    val = answers_map.get(field.id, "")
                    if isinstance(val, list):
                        val = "; ".join(str(v) for v in val)
                    elif val is None:
                        val = ""
                    elif field.type == FormFieldType.DATE and val:
                        val = _format_human_date(str(val))
                    row.append(str(val))
                writer.writerow(row)
                yield output.getvalue()
                output.seek(0)
                output.truncate(0)

            offset += batch_size

    # ── Public endpoints ──────────────────────────────────────────────────────

    async def get_public_form(self, *, form_id: UUID, session: AsyncSession) -> Form:
        result = await session.exec(
            select(Form)
            .options(selectinload(Form.fields))
            .where(
                Form.id == form_id,
                Form.is_published == True,
                Form.deleted_at == None,
            )
        )
        form = result.first()
        if not form:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Form not found or not published",
            )
        # Sort fields by order
        form.fields = sorted(form.fields, key=lambda f: f.order)
        return form

    def _is_form_accepting(self, form: Form) -> tuple[bool, str]:
        """Returns (accepting, reason)."""
        now = utc_now()
        if not form.accepts_responses:
            return False, "This form is no longer accepting responses."
        if form.closes_at and form.closes_at < now:
            return False, "This form has closed."
        return True, ""

    def _validate_answers(self, form: Form, answers: list[AnswerIn]) -> list[dict]:
        """Returns list of {field_id, error} if validation fails."""
        errors = []
        field_map = {f.id: f for f in form.fields}
        answer_map = {a.field_id: a.value for a in answers}

        for field in form.fields:
            val = answer_map.get(field.id)

            # Required check
            if field.is_required:
                if val is None:
                    errors.append({"field_id": str(field.id), "error": "This field is required."})
                    continue
                if isinstance(val, str) and not val.strip():
                    errors.append({"field_id": str(field.id), "error": "This field is required."})
                    continue
                if isinstance(val, list) and len(val) == 0:
                    errors.append({"field_id": str(field.id), "error": "This field is required."})
                    continue

            if val is None or (isinstance(val, str) and not val.strip()):
                continue

            # Type-specific validation
            if field.type == FormFieldType.EMAIL:
                if not _EMAIL_RE.match(str(val)):
                    errors.append({"field_id": str(field.id), "error": "Please enter a valid email address."})

            elif field.type == FormFieldType.PHONE:
                if not _PHONE_RE.match(str(val).strip()):
                    errors.append({"field_id": str(field.id), "error": "Please enter a valid phone number."})

            elif field.type == FormFieldType.DATE:
                # Value is string (YYYY-MM-DD or --MM-DD)
                include_year = True
                min_date = None
                max_date = None
                if field.date_config:
                    include_year = field.date_config.get("include_year", True)
                    min_date = field.date_config.get("min_date")
                    max_date = field.date_config.get("max_date")

                import re
                from datetime import datetime, timezone, timedelta

                full_date_re = re.compile(r"^\d{4}-\d{2}-\d{2}$")
                no_year_re = re.compile(r"^--\d{2}-\d{2}$")

                if include_year:
                    if not isinstance(val, str) or not full_date_re.match(val):
                        errors.append({"field_id": str(field.id), "error": "Invalid date format. Expected YYYY-MM-DD."})
                        continue
                    try:
                        parsed_date = datetime.strptime(val, "%Y-%m-%d")
                    except ValueError:
                        errors.append({"field_id": str(field.id), "error": "Invalid date value."})
                        continue

                    if min_date and val < min_date:
                        errors.append({"field_id": str(field.id), "error": f"Date must not be before {min_date}."})

                    if max_date:
                        if val > max_date:
                            errors.append({"field_id": str(field.id), "error": f"Date must not be after {max_date}."})
                    else:
                        # Default max: today + 1 day grace buffer for timezone safety
                        tomorrow_utc = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
                        if val > tomorrow_utc:
                            errors.append({"field_id": str(field.id), "error": "Date cannot be in the future."})
                else:
                    if not isinstance(val, str) or not no_year_re.match(val):
                        errors.append({"field_id": str(field.id), "error": "Invalid date format. Expected --MM-DD."})
                        continue
                    try:
                        # Prepend leap year 2000 to support Feb 29
                        parsed_date = datetime.strptime(f"2000-{val[2:]}", "%Y-%m-%d")
                    except ValueError:
                        errors.append({"field_id": str(field.id), "error": "Invalid date value."})
                        continue

                    if min_date and val < min_date:
                        errors.append({"field_id": str(field.id), "error": f"Date must not be before {min_date[2:]}."})
                    if max_date and val > max_date:
                        errors.append({"field_id": str(field.id), "error": f"Date must not be after {max_date[2:]}."})

            elif field.type == FormFieldType.MULTIPLE_CHOICE_SINGLE:
                valid_opts = set(field.options or [])
                submitted = str(val)
                if field.allow_other:
                    # Only one value allowed; it's valid if in options OR is the "other" free text
                    # We allow any single string value
                    pass
                else:
                    if submitted not in valid_opts:
                        errors.append({"field_id": str(field.id), "error": "Invalid option selected."})

            elif field.type == FormFieldType.MULTIPLE_CHOICE_MULTI:
                valid_opts = set(field.options or [])
                submitted_vals = val if isinstance(val, list) else [val]
                invalid = [v for v in submitted_vals if v not in valid_opts]
                if not field.allow_other and invalid:
                    errors.append({"field_id": str(field.id), "error": f"Invalid option(s): {', '.join(str(i) for i in invalid)}"})
                elif field.allow_other:
                    # All options except at most one "other" must be in valid_opts
                    known = [v for v in submitted_vals if v in valid_opts]
                    unknown = [v for v in submitted_vals if v not in valid_opts]
                    if len(unknown) > 1:
                        errors.append({"field_id": str(field.id), "error": "Only one custom 'other' value is allowed."})

        return errors

    async def submit_response(self, *, form_id: UUID, submission: SubmitResponseIn, session: AsyncSession) -> dict:
        if submission.idempotency_key:
            from src.db.redis import redis_client
            import json
            redis_key = f"form_sub_idempotency:{submission.idempotency_key}"
            try:
                cached_res = await redis_client.get(redis_key)
                if cached_res:
                    logger.info(f"Duplicate submission detected for key {submission.idempotency_key}")
                    if isinstance(cached_res, bytes):
                        cached_res = cached_res.decode("utf-8")
                    return json.loads(cached_res)
            except Exception as e:
                logger.error(f"Redis error reading idempotency key: {e}")

        form = await session.exec(
            select(Form)
            .options(selectinload(Form.fields))
            .where(Form.id == form_id, Form.deleted_at == None)
        )
        form = form.first()

        if not form:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Form not found",
            )
        if not form.is_published:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Form not found or not published",
            )

        accepting, reason = self._is_form_accepting(form)
        if not accepting:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=reason,
            )

        errors = self._validate_answers(form, submission.answers)
        if errors:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"errors": errors},
            )

        new_response = FormResponse(form_id=form_id)
        try:
            session.add(new_response)
            await session.flush()

            field_ids = {f.id for f in form.fields}
            for answer in submission.answers:
                if answer.field_id not in field_ids:
                    continue
                new_answer = FormAnswer(
                    response_id=new_response.id,
                    field_id=answer.field_id,
                    value=answer.value,
                )
                session.add(new_answer)

            await session.commit()
            
            res_data = {"detail": "Response submitted successfully"}
            if submission.idempotency_key:
                from src.db.redis import redis_client
                import json
                redis_key = f"form_sub_idempotency:{submission.idempotency_key}"
                try:
                    await redis_client.setex(name=redis_key, time=86400, value=json.dumps(res_data)) # 24h TTL
                except Exception as e:
                    logger.error(f"Redis error writing idempotency key: {e}")

            logger.info(f"Submitted response {new_response.id} for form {form_id}")
            return res_data
        except Exception as e:
            await session.rollback()
            logger.error(f"Error submitting response for form {form_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error",
            )

    async def delete_response(self, *, form_id: UUID, response_id: UUID, user_id: UUID, session: AsyncSession) -> dict:
        await self._get_form(form_id, user_id, session)

        result = await session.exec(
            select(FormResponse).where(
                FormResponse.id == response_id,
                FormResponse.form_id == form_id,
            )
        )
        response = result.first()
        if not response:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Response not found",
            )

        try:
            await session.delete(response)
            await session.commit()
            logger.info(f"Permanently deleted response {response_id} from form {form_id}")
            return {"detail": "Response deleted successfully"}
        except Exception as e:
            await session.rollback()
            logger.error(f"Error deleting response {response_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error",
            )

    async def bulk_delete_responses(self, *, form_id: UUID, response_ids: list[UUID], user_id: UUID, session: AsyncSession) -> dict:
        await self._get_form(form_id, user_id, session)

        if not response_ids:
            return {"deleted_count": 0}

        try:
            from sqlmodel import delete
            # Delete answers first to avoid foreign key violations, then responses
            stmt_answers = delete(FormAnswer).where(FormAnswer.response_id.in_(response_ids))
            await session.exec(stmt_answers)

            stmt_responses = delete(FormResponse).where(
                FormResponse.id.in_(response_ids),
                FormResponse.form_id == form_id,
            )
            result = await session.exec(stmt_responses)
            await session.commit()

            deleted_count = result.rowcount
            logger.info(f"Bulk deleted {deleted_count} responses from form {form_id}")
            return {"deleted_count": deleted_count}
        except Exception as e:
            await session.rollback()
            logger.error(f"Error bulk deleting responses: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error",
            )

    async def edit_response(
        self,
        *,
        form_id: UUID,
        response_id: UUID,
        answers_input: list[AnswerIn],
        user_id: UUID,
        session: AsyncSession,
    ) -> FormResponse:
        form = await self._get_form_with_fields(form_id, user_id, session)

        resp_result = await session.exec(
            select(FormResponse)
            .options(selectinload(FormResponse.answers))
            .where(
                FormResponse.id == response_id,
                FormResponse.form_id == form_id,
            )
        )
        response = resp_result.first()
        if not response:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Response not found",
            )

        # Merge existing answers with patched answers for validation
        existing_answers = {a.field_id: a.value for a in response.answers}
        patch_answers = {a.field_id: a.value for a in answers_input}
        merged_answers_map = {**existing_answers, **patch_answers}
        merged_answers_list = [
            AnswerIn(field_id=fid, value=val)
            for fid, val in merged_answers_map.items()
            if val is not None
        ]

        errors = self._validate_answers(form, merged_answers_list)
        if errors:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"errors": errors},
            )

        try:
            ans_obj_map = {a.field_id: a for a in response.answers}
            field_ids = {f.id for f in form.fields}

            for answer in answers_input:
                if answer.field_id not in field_ids:
                    continue

                if answer.field_id in ans_obj_map:
                    ans_obj_map[answer.field_id].value = answer.value
                    session.add(ans_obj_map[answer.field_id])
                else:
                    new_ans = FormAnswer(
                        response_id=response_id,
                        field_id=answer.field_id,
                        value=answer.value,
                    )
                    session.add(new_ans)

            await session.commit()

            updated_resp = await session.exec(
                select(FormResponse)
                .options(selectinload(FormResponse.answers))
                .where(FormResponse.id == response_id)
            )
            return updated_resp.first()
        except Exception as e:
            await session.rollback()
            logger.error(f"Error editing response {response_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error",
            )

