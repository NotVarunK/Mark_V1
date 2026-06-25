import enum
import uuid
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Role(str, enum.Enum):
    ADMIN = "ADMIN"
    STUDENT = "STUDENT"

class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"

class User(Base):
    __tablename__ = "User"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(Role, name="Role"), nullable=False)
    class_id = Column(String, ForeignKey("Class.id"), nullable=True)
    batch = Column(String, nullable=True)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    class_ = relationship("Class", back_populates="students")
    attendance = relationship("AttendanceLog", back_populates="student", cascade="all, delete-orphan")

class Class(Base):
    __tablename__ = "Class"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    class_code = Column(String, unique=True, nullable=False)
    stream = Column(String, nullable=False)
    academic_year = Column(String, nullable=False)
    division = Column(String, nullable=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    students = relationship("User", back_populates="class_")
    timetable = relationship("TimetableSlot", back_populates="class_", cascade="all, delete-orphan")

class TimetableSlot(Base):
    __tablename__ = "TimetableSlot"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    class_id = Column(String, ForeignKey("Class.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(String, nullable=False)
    subject_name = Column(String, nullable=False)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    class_ = relationship("Class", back_populates="timetable")
    attendance = relationship("AttendanceLog", back_populates="slot", cascade="all, delete-orphan")

class AttendanceLog(Base):
    __tablename__ = "AttendanceLog"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String, ForeignKey("User.id", ondelete="CASCADE"), nullable=False)
    slot_id = Column(String, ForeignKey("TimetableSlot.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(Enum(AttendanceStatus, name="AttendanceStatus"), default=AttendanceStatus.PRESENT, nullable=False)
    device_fingerprint = Column(String, nullable=True)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    student = relationship("User", back_populates="attendance")
    slot = relationship("TimetableSlot", back_populates="attendance")

    __table_args__ = (
        UniqueConstraint("student_id", "slot_id", "date", name="AttendanceLog_student_id_slot_id_date_key"),
    )

class Holiday(Base):
    __tablename__ = "Holiday"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    date = Column(Date, unique=True, nullable=False)
    name = Column(String, nullable=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
