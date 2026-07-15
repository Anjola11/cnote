import uuid
from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from uuid import UUID
from fastapi import UploadFile
from sqlalchemy.orm import selectinload

from src.fileUpload.main import FileUploadServices
from src.auth.models import User
from src.notes.models import Note, NoteCategory, NoteMediaUpload
from src.notes.schemas import NoteCreateInput
from src.utils.logger import logger
from src.utils.utc_now import utc_now


class NoteServices:
    async def _update_user_storage_used_bytes(self, user_id: UUID, delta_bytes: int, session: AsyncSession) -> None:
        if not delta_bytes:
            return

        from sqlalchemy import update, func
        await session.execute(
            update(User)
            .where(User.uid == user_id)
            .values(
                storage_used_bytes=func.greatest(0, func.coalesce(User.storage_used_bytes, 0) + delta_bytes),
                updated_at=utc_now()
            )
        )

    def _extract_text(self, node: dict) -> str:
        if node.get("type") == "text":
            return node.get("text", "")
        children = node.get("content", [])
        return " ".join(self._extract_text(c) for c in children if c)

    def _parse_content(self, content: dict) -> dict:
        text = self._extract_text(content)
        return {
            "content_text": text,
            "word_count": len(text.split()) if text.strip() else 0,
        }

    async def _get_note(self, note_id: UUID, user_id: UUID, session: AsyncSession, for_update: bool = False) -> Note:
        statement = select(Note).where(
            Note.id == note_id,
            Note.uid == user_id,
            Note.deleted_at == None,
        )
        if for_update:
            statement = statement.with_for_update()
            
        result = await session.exec(statement)
        note = result.first()
        if not note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Note not found",
            )
        return note

    async def _get_note_media(
        self,
        note_id: UUID,
        user_id: UUID,
        public_id: str,
        session: AsyncSession,
    ) -> NoteMediaUpload:
        result = await session.exec(
            select(NoteMediaUpload).where(
                NoteMediaUpload.note_id == note_id,
                NoteMediaUpload.user_id == user_id,
                NoteMediaUpload.cloudinary_public_id == public_id,
            )
        )
        media = result.first()
        if not media:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Note image not found",
            )
        return media

    def _serialize_public_note(self, note: Note) -> dict:
        author = note.user
        return {
            "title": note.title,
            "content": note.content,
            "category": note.category,
            "created_at": note.created_at,
            "word_count": note.word_count,
            "display_name": author.display_name or author.username if author else None,
            "avatar_url": author.profile_picture_url if author else None,
        }

    async def create_note(self, *, user_id: UUID, note_input: NoteCreateInput, session: AsyncSession) -> Note:
        content = note_input.content or {}
        content_extract = self._parse_content(content)

        new_note = Note(
            uid=user_id,
            category=note_input.category,
            title=note_input.title,
            content=content,
            content_text=content_extract.get("content_text", ""),
            word_count=content_extract.get("word_count", 0),
        )

        try:
            session.add(new_note)
            await session.commit()
            await session.refresh(new_note)
            logger.info(f"Created new Note {new_note.id} for user {user_id}")
            return new_note
        except Exception as e:
            await session.rollback()
            logger.error(f"Error creating Note {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error",
            )

    async def update_note_content(self, note_id: UUID, user_id: UUID, content: dict | None, session: AsyncSession, expected_version: int | None = None) -> Note:
        note = await self._get_note(note_id=note_id, user_id=user_id, session=session, for_update=True)

        if expected_version is not None:
            if note.version != expected_version:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Conflict: Note has been modified elsewhere. Please reload."
                )
            note.version += 1

        if content is not None:
            note.content = content
            content_extract = self._parse_content(content)
            note.content_text = content_extract.get("content_text", "")
            note.word_count = content_extract.get("word_count", 0)
            note.updated_at = utc_now()

        try:
            session.add(note)
            await session.commit()
            await session.refresh(note)
            logger.info(f"Updated content for note {note.id}")
            return note
        except Exception as e:
            await session.rollback()
            logger.error(f"Error updating Note {note.id} - {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error",
            )

    async def update_note_title(
        self,
        note_id: UUID,
        user_id: UUID,
        title: str | None,
        session: AsyncSession,
    ) -> Note:
        note = await self._get_note(note_id, user_id, session)

        note.title = title
        note.updated_at = utc_now()

        try:
            session.add(note)
            await session.commit()
            await session.refresh(note)
            logger.info(f"Updated title for note {note.id}")
            return note

        except Exception as e:
            await session.rollback()
            logger.error(f"Error updating title for note {note.id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error",
            )

    async def delete_note(self, note_id: UUID, user_id: UUID, session: AsyncSession) -> dict:
        note = await self._get_note(note_id, user_id, session)
        note.deleted_at = utc_now()

        try:
            session.add(note)
            await session.commit()
            logger.info(f"Soft-deleted note {note.id}")
            return {"detail": "Note deleted"}

        except Exception as e:
            await session.rollback()
            logger.error(f"Error deleting note {note.id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error",
            )

    async def restore_note(self, note_id: UUID, user_id: UUID, session: AsyncSession) -> Note:
        result = await session.exec(
            select(Note).where(
                Note.id == note_id,
                Note.uid == user_id,
            )
        )
        note = result.first()
        if not note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Note not found",
            )

        note.deleted_at = None
        note.updated_at = utc_now()

        try:
            session.add(note)
            await session.commit()
            await session.refresh(note)
            logger.info(f"Restored note {note.id}")
            return note
        except Exception as e:
            await session.rollback()
            logger.error(f"Error restoring note {note.id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error",
            )

    async def get_note(self, note_id: UUID, user_id: UUID, session: AsyncSession) -> Note:
        return await self._get_note(note_id, user_id, session)

    async def list_notes(
        self,
        user_id: UUID,
        session: AsyncSession,
        category: NoteCategory | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Note]:
        statement = (
            select(
                Note.id,
                Note.category,
                Note.title,
                Note.word_count,
                Note.content_text,
                Note.is_public,
                Note.created_at,
                Note.updated_at,
            )
            .where(
                Note.uid == user_id,
                Note.deleted_at == None,
            )
            .order_by(Note.updated_at.desc())
            .offset(offset)
            .limit(limit)
        )

        if category is not None:
            statement = statement.where(Note.category == category)

        result = await session.exec(statement)
        return result.all()

    async def list_deleted_notes(
        self,
        user_id: UUID,
        session: AsyncSession,
        limit: int = 50,
        offset: int = 0,
    ):
        statement = (
            select(
                Note.id,
                Note.category,
                Note.title,
                Note.word_count,
                Note.content_text,
                Note.is_public,
                Note.deleted_at,
                Note.created_at,
                Note.updated_at,
            )
            .where(
                Note.uid == user_id,
                Note.deleted_at != None,
            )
            .order_by(Note.deleted_at.desc())
            .offset(offset)
            .limit(limit)
        )

        result = await session.exec(statement)
        logger.info(f"Fetched deleted notes for user {user_id}")
        return result.all()

    async def upload_note_media(
        self,
        note_id: UUID,
        user_id: UUID,
        file: UploadFile,
        session: AsyncSession,
        file_upload_services: FileUploadServices,
    ) -> dict:
        note = await self._get_note(note_id=note_id, user_id=user_id, session=session)
        upload_result = await file_upload_services.upload_note_image(
            file=file,
            user_id=user_id,
            note_id=note.id,
        )

        new_media = NoteMediaUpload(
            note_id=note.id,
            user_id=user_id,
            cloudinary_public_id=upload_result["public_id"],
            size_bytes=upload_result["size_bytes"],
            last_height_px=upload_result["height"],
            last_width_px=upload_result["width"],
            format=upload_result["format"],
        )

        try:
            session.add(new_media)
            await session.flush()
            await self._update_user_storage_used_bytes(
                user_id=user_id,
                delta_bytes=int(new_media.size_bytes or 0),
                session=session,
            )
            await session.commit()
            await session.refresh(new_media)
            logger.info(f"Uploaded image {new_media.cloudinary_public_id} for note {note.id}")
            return {
                "public_id": new_media.cloudinary_public_id,
                "url": upload_result["url"] or new_media.url,
            }
        except Exception as e:
            await session.rollback()
            logger.error(f"Error saving note image for note {note.id}: {e}")
            await file_upload_services.delete_file(upload_result["public_id"])
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error",
            )

    async def delete_note_media(
        self,
        note_id: UUID,
        user_id: UUID,
        public_id: str,
        session: AsyncSession,
        file_upload_services: FileUploadServices,
    ) -> dict:
        note = await self._get_note(note_id=note_id, user_id=user_id, session=session)
        media = await self._get_note_media(
            note_id=note.id,
            user_id=user_id,
            public_id=public_id,
            session=session,
        )

        try:
            await file_upload_services.delete_file(media.cloudinary_public_id)
            await session.delete(media)
            await session.flush()
            await self._update_user_storage_used_bytes(
                user_id=user_id,
                delta_bytes=-int(media.size_bytes or 0),
                session=session,
            )
            await session.commit()
            logger.info(f"Deleted image {media.cloudinary_public_id} for note {note.id}")
            return {"detail": "Note image deleted"}
        except HTTPException:
            raise
        except Exception as e:
            await session.rollback()
            logger.error(f"Error deleting note image {media.cloudinary_public_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error",
            )

    async def update_note_share(
        self,
        note_id: UUID,
        user_id: UUID,
        is_public: bool,
        session: AsyncSession,
    ) -> dict:
        note = await self._get_note(note_id=note_id, user_id=user_id, session=session)
        note.is_public = is_public
        note.share_token = uuid.uuid4().hex if is_public else None
        note.updated_at = utc_now()

        try:
            session.add(note)
            await session.commit()
            await session.refresh(note)
            logger.info(f"Updated share state for note {note.id}")
            return {
                "id": note.id,
                "is_public": note.is_public,
                "share_token": note.share_token,
            }
        except Exception as e:
            await session.rollback()
            logger.error(f"Error updating share state for note {note.id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error",
            )

    async def get_public_note(self, share_token: str, session: AsyncSession) -> dict:
        result = await session.exec(
            select(Note)
            .options(selectinload(Note.user))
            .where(
                Note.share_token == share_token,
                Note.is_public == True,
                Note.deleted_at == None,
            )
        )
        note_with_author = result.first()

        if not note_with_author:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Public note not found",
            )

        return self._serialize_public_note(note_with_author)

    async def get_public_note_meta(self, share_token: str, session: AsyncSession) -> dict:
        result = await session.exec(
            select(Note)
            .options(selectinload(Note.media))
            .where(
                Note.share_token == share_token,
                Note.is_public == True,
                Note.deleted_at == None,
            )
        )
        note = result.first()

        if not note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Public note metadata not found",
            )

        cover_image_url = None
        if note.media:
            cover_image_url = note.media[0].url

        if not cover_image_url:
            # Fallback to Cnote brand asset
            cover_image_url = "https://www.usecnote.xyz/og-image.png"

        return {
            "title": note.title or "Untitled Note",
            "excerpt": (note.content_text[:160] + "...") if note.content_text and len(note.content_text) > 160 else (note.content_text or "No content available."),
            "coverImageUrl": cover_image_url,
        }
