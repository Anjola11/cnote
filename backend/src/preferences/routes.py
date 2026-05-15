from fastapi import APIRouter, Depends, Request, status
from sqlmodel.ext.asyncio.session import AsyncSession
from src.db.main import get_session
from src.utils.dependencies import get_verified_user_id
from src.utils.responses import success_response
from src.limiter import get_user_id_or_ip, limiter
from .service import PreferenceService
from .schemas import PreferenceUpdateInput, PreferenceResponse, PreferenceListResponse
from .models import PreferenceKey

preferences_router = APIRouter()

def get_preference_service() -> PreferenceService:
    return PreferenceService()

@preferences_router.get("/", response_model=PreferenceListResponse, status_code=status.HTTP_200_OK)
@limiter.limit("60/minute", key_func=get_user_id_or_ip)
async def get_preferences(
    request: Request,
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    preference_service: PreferenceService = Depends(get_preference_service)
):
    preferences = await preference_service.get_user_preferences(session, user_id)
    return success_response(message="Preferences fetched successfully", data=preferences)

@preferences_router.patch("/", response_model=PreferenceResponse, status_code=status.HTTP_200_OK)
@limiter.limit("120/minute", key_func=get_user_id_or_ip)
async def update_preference(
    request: Request,
    body: PreferenceUpdateInput,
    user_id=Depends(get_verified_user_id),
    session: AsyncSession = Depends(get_session),
    preference_service: PreferenceService = Depends(get_preference_service)
):
    preference = await preference_service.upsert_preference(
        session, user_id, body.key, body.value
    )
    return success_response(message="Preference updated successfully", data=preference)
