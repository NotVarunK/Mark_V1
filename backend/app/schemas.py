from pydantic import BaseModel
from typing import List, Optional

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class OAuthRequest(BaseModel):
    token: str

class ClassCreateRequest(BaseModel):
    stream: str
    academic_year: str
    division: str

class TimetableSlotSchema(BaseModel):
    id: Optional[str] = None
    day_of_week: str
    subject_name: str
    start_time: str
    end_time: str

class TimetableSaveRequest(BaseModel):
    slots: List[TimetableSlotSchema]

class JoinClassRequest(BaseModel):
    class_code: str

class CheckinRequest(BaseModel):
    slotId: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    date: Optional[str] = None  # YYYY-MM-DD
    device_fingerprint: Optional[str] = None

class UpdateBatchRequest(BaseModel):
    batch: Optional[str] = None

class AttendanceOverrideRequest(BaseModel):
    student_id: str
    slot_id: str
    date: str  # YYYY-MM-DD
    status: str  # PRESENT or ABSENT

class HolidayCreateRequest(BaseModel):
    date: str  # YYYY-MM-DD
    name: str

class AdjustmentCreateRequest(BaseModel):
    class_id: str
    slot_id: str
    date: str  # YYYY-MM-DD
    is_cancelled: bool = False
    replaced_subject: Optional[str] = None

class UpdatePasswordRequest(BaseModel):
    password: str
