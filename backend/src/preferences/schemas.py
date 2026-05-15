from pydantic import BaseModel
from .models import PreferenceKey, UserPreference
from typing import List, Any

class PreferenceUpdateInput(BaseModel):
    key: PreferenceKey
    value: str

class PreferenceResponse(BaseModel):
    message: str
    data: UserPreference

class PreferenceListResponse(BaseModel):
    message: str
    data: List[UserPreference]
