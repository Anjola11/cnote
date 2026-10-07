from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
import uuid
from src.db.main import get_session
from src.notes.models import Note
from src.forms.models import Form

seo_router = APIRouter()

CACHE_CONTROL_5MIN = "public, s-maxage=300, stale-while-revalidate=86400"
CACHE_CONTROL_1HR = "public, s-maxage=3600, stale-while-revalidate=86400"

@seo_router.get("/note/{share_token}", status_code=status.HTTP_200_OK)
async def get_note_seo(
    share_token: str,
    response: Response,
    session: AsyncSession = Depends(get_session)
):
    """
    Public unauthenticated SEO endpoint for shared notes.
    Returns only safe public metadata fields for scraper/crawler head injection.
    """
    stmt = select(Note).where(
        Note.share_token == share_token,
        Note.is_public == True,
        Note.deleted_at == None
    )
    res = await session.exec(stmt)
    note = res.first()

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Public note not found or no longer shared"
        )

    # Extract text snippet for meta description
    raw_text = (note.content_text or "").strip()
    description = raw_text[:160] + "..." if len(raw_text) > 160 else (raw_text or "A shared note on Cnote - your personal journal.")

    response.headers["Cache-Control"] = CACHE_CONTROL_5MIN
    response.headers["X-Robots-Tag"] = "noindex"

    seo_data = {
        "success": True,
        "message": "Note SEO metadata fetched",
        "data": {
            "type": "note",
            "title": note.title or "Untitled Note",
            "description": description,
            "share_token": note.share_token,
            "category": note.category.value if note.category else "general",
            "word_count": note.word_count,
            "updated_at": note.updated_at.isoformat() if note.updated_at else None,
            "created_at": note.created_at.isoformat() if note.created_at else None,
        }
    }

    return seo_data


@seo_router.get("/form/{form_id}", status_code=status.HTTP_200_OK)
async def get_form_seo(
    form_id: uuid.UUID,
    response: Response,
    session: AsyncSession = Depends(get_session)
):
    """
    Public unauthenticated SEO endpoint for shared forms.
    Enforces noindex header so search engines never index form links.
    """
    stmt = select(Form).where(
        Form.id == form_id,
        Form.is_published == True,
        Form.deleted_at == None
    )
    res = await session.exec(stmt)
    form = res.first()

    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found or not published"
        )

    response.headers["Cache-Control"] = CACHE_CONTROL_5MIN
    response.headers["X-Robots-Tag"] = "noindex, nofollow"

    seo_data = {
        "success": True,
        "message": "Form SEO metadata fetched",
        "data": {
            "type": "form",
            "id": str(form.id),
            "title": form.title or "Untitled Form",
            "description": form.description or "Fill out this form on Cnote.",
            "logo_url": form.logo_url,
            "updated_at": form.updated_at.isoformat() if form.updated_at else None,
            "created_at": form.created_at.isoformat() if form.created_at else None,
        }
    }

    return seo_data


@seo_router.get("/sitemap-entries", status_code=status.HTTP_200_OK)
async def get_sitemap_entries(
    response: Response,
    session: AsyncSession = Depends(get_session)
):
    """
    Public unauthenticated endpoint returning indexable public note URLs.
    Excludes user forms to prevent search engine indexing of forms.
    """
    response.headers["Cache-Control"] = CACHE_CONTROL_1HR
    response.headers["X-Robots-Tag"] = "noindex"

    # Public Notes Only
    note_stmt = select(Note.share_token, Note.updated_at, Note.created_at).where(
        Note.is_public == True,
        Note.deleted_at == None
    )
    note_res = await session.exec(note_stmt)
    notes = note_res.all()

    entries = []
    for token, updated, created in notes:
        if token:
            entries.append({
                "type": "note",
                "identifier": token,
                "updated_at": (updated or created).isoformat() if (updated or created) else None
            })

    return {
        "success": True,
        "message": "Sitemap entries fetched",
        "data": entries
    }
