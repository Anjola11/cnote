import asyncio
from datetime import datetime, timezone, timedelta
from sqlmodel import select
from sqlalchemy.orm import selectinload
from src.db.main import async_session_maker
from src.notes.models import Note
from src.fileUpload.main import FileUploadServices
from src.utils.logger import logger

async def purge_deleted_notes():
    logger.info("Starting background purge of soft-deleted notes older than 90 days.")
    retention_limit = datetime.now(timezone.utc) - timedelta(days=90)
    file_upload = FileUploadServices()
    
    async with async_session_maker() as session:
        try:
            # Query soft-deleted notes older than 90 days, eager loading media uploads
            statement = (
                select(Note)
                .options(selectinload(Note.media))
                .where(Note.deleted_at != None, Note.deleted_at < retention_limit)
            )
            result = await session.exec(statement)
            notes_to_purge = result.all()
            
            if not notes_to_purge:
                logger.info("No expired soft-deleted notes to purge.")
                return
                
            for note in notes_to_purge:
                logger.info(f"Purging note {note.id} deleted at {note.deleted_at}")
                for media in note.media:
                    try:
                        await file_upload.delete_file(media.cloudinary_public_id)
                        logger.info(f"Deleted Cloudinary image {media.cloudinary_public_id}")
                    except Exception as e:
                        logger.error(f"Failed to delete Cloudinary media {media.cloudinary_public_id}: {e}")
                
                await session.delete(note)
            
            await session.commit()
            logger.info(f"Soft-deleted notes purge completed successfully. Purged {len(notes_to_purge)} notes.")
        except Exception as e:
            await session.rollback()
            logger.error(f"Error purging soft-deleted notes: {e}")
