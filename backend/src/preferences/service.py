from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
import uuid
from .models import UserPreference, PreferenceKey, PREFERENCE_VALUE_MAP
from src.utils.utc_now import utc_now
from fastapi import HTTPException, status

class PreferenceService:
    def _validate_preference_value(self, key: PreferenceKey, value: str):
        validator = PREFERENCE_VALUE_MAP.get(key)
        # In Python, Enums have ._value2member_map_ which maps values to members
        if validator and value not in validator._value2member_map_:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid value '{value}' for preference '{key}'"
            )

    async def get_user_preferences(self, session: AsyncSession, user_id: uuid.UUID):
        statement = select(UserPreference).where(UserPreference.uid == user_id)
        result = await session.execute(statement)
        return result.scalars().all()

    async def get_preference(self, session: AsyncSession, user_id: uuid.UUID, key: PreferenceKey):
        statement = select(UserPreference).where(
            UserPreference.uid == user_id, 
            UserPreference.key == key
        )
        result = await session.execute(statement)
        return result.scalar_one_or_none()

    async def upsert_preference(self, session: AsyncSession, user_id: uuid.UUID, key: PreferenceKey, value: str):
        self._validate_preference_value(key, value)
        preference = await self.get_preference(session, user_id, key)

        if preference:
            preference.value = value
            preference.updated_at = utc_now()
        else:
            preference = UserPreference(
                uid=user_id,
                key=key,
                value=value
            )
            session.add(preference)
        
        await session.commit()
        await session.refresh(preference)
        return preference
