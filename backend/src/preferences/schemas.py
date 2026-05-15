from pydantic import BaseModel
from .models import PreferenceKey, UserPreference
from typing import List, Any
import uuid
from datetime import datetime

class PreferenceUpdateInput(BaseModel):
    key: PreferenceKey
    value: str

class PreferenceRead(BaseModel):
    id: uuid.UUID
    key: str
    value: str
    created_at: datetime
    updated_at: datetime

class PreferenceResponse(BaseModel):
    message: str
    data: PreferenceRead

class PreferenceListResponse(BaseModel):
    message: str
    data: List[PreferenceRead]
