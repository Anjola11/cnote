from magika import Magika, PredictionMode
from fastapi import UploadFile, HTTPException, status
import cloudinary
from cloudinary.uploader import upload, destroy
import asyncio
import uuid
from enum import Enum

from src.config import Config
from src.utils.logger import logger

class ImageCategory(str, Enum):
    AVATAR = "avatar"
    NOTE_IMG = "NOTE_IMG"

max_avatar_upload_size = 8
max_note_img_upload_size = 10

cloudinary.config(
    cloud_name=Config.CLOUDINARY_CLOUD_NAME,
    api_key=Config.CLOUDINARY_API_KEY,
    api_secret=Config.CLOUDINARY_API_SECRET
)

_magika = Magika()

ALLOWED_MIME_TYPES = {
    "image/jpeg", 
    "image/png", 
    "image/webp", 
    "image/gif", 
    "image/avif", 
    "image/heic", 
    "image/heif", 
    "image/bmp", 
    "image/tiff"
}

class FileUploadServices:

    async def get_file_size(self, file: UploadFile) -> int:
        #
        try:
            await asyncio.to_thread(file.file.seek, 0, 2)
            size = await asyncio.to_thread(file.file.tell)
        finally:
            await asyncio.to_thread(file.file.seek, 0)
        return size

    async def validate_file(self, file: UploadFile, image_category: ImageCategory) -> int:
        max_upload_bytes = (
            max_avatar_upload_size
            if image_category == ImageCategory.AVATAR
            else max_note_img_upload_size
        )

        # Read a header chunk and reset 
        header_data = await file.read(2048)
        await file.seek(0)
        
        result = _magika.identify_bytes(header_data)
        real_mime = result.output.mime_type
        
        # Fallback for valid images that Magika might miss (e.g. strict confidence modes)
        if real_mime == "application/octet-stream":
            if header_data.startswith(b"\x89PNG\r\n\x1a\n"):
                real_mime = "image/png"
            elif header_data.startswith(b"\xff\xd8\xff"):
                real_mime = "image/jpeg"
            elif header_data.startswith(b"RIFF") and header_data[8:12] == b"WEBP":
                real_mime = "image/webp"

        if real_mime not in ALLOWED_MIME_TYPES:
            logger.error(f"Upload blocked: MIME type '{real_mime}' (Magika Label: {result.output.ct_label}) is not allowed.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image format. Please upload a standard JPEG, PNG, WebP, or GIF."
            )

        file_size = await self.get_file_size(file)

        if file_size > (max_upload_bytes * 1024 * 1024):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File exceeds maximum size of {max_upload_bytes}MB"
            )

        return file_size
        
    async def upload_avatar(self, file: UploadFile, user_id: uuid.UUID, old_avatar_id: str | None = None):
        await self.validate_file(file, ImageCategory.AVATAR)

        file_path = f"CNOTE/AVATARS/{user_id}"


        #cleanup logic
        if old_avatar_id:
            try:
                await asyncio.to_thread(
                    destroy,
                    old_avatar_id
                )
            except Exception as e:
                logger.error(f"Warning: Failed to delete old image: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"image delete failed:"
                )
        try:
            response = await asyncio.to_thread(
                upload,
                file.file,
                folder=file_path,
            )
            return {
                "public_id": response["public_id"],
                "url": response.get("secure_url"),
            }
        except Exception as e:
            logger.error(f"Warning: Failed to upload new image: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"image upload failed:"
            )


    async def upload_note_image(self, file: UploadFile, user_id: uuid.UUID, note_id: uuid.UUID):
        file_size = await self.validate_file(file, ImageCategory.NOTE_IMG)


     
        file_path = f"CNOTE/NOTES/{user_id}/{note_id}"
        

        try:
            response = await asyncio.to_thread(
                upload,
                file.file,
                folder=file_path,
                resource_type="auto"
            )
            return {
                "public_id": response["public_id"],
                "url": response.get("secure_url"),
                "size_bytes": file_size,
                "height": response.get("height", 0),
                "width": response.get("width", 0),
                "format": response.get("format", ""),
            }
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Cloudinary upload failed: {str(e)}"
            )
        
    async def delete_file(self, cloudinary_public_id: str):
        try:
            await asyncio.to_thread(
                destroy,
                cloudinary_public_id
            )
        except Exception as e:
            logger.error(f"Warning: Failed to delete old image: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"image delete failed:"
            )
