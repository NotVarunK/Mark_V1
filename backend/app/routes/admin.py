import re
import random
import string
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Class, TimetableSlot, User, Role
from app.schemas import ClassCreateRequest, TimetableSaveRequest
from app.auth_utils import require_role

router = APIRouter(prefix="/admin", tags=["Admin Control Panel"])

# Protect all admin routes with require_role(["ADMIN"]) dependency
router.dependencies = [Depends(require_role(["ADMIN"]))]

def generate_class_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return "".join(random.choice(chars) for _ in range(6))

@router.get("/classes")
def get_classes(db: Session = Depends(get_db)):
    try:
        classes = db.query(Class).order_by(Class.createdAt.desc()).all()
        result = []
        for cls in classes:
            # Format classes matching Node output structure
            result.append({
                "id": cls.id,
                "class_code": cls.class_code,
                "stream": cls.stream,
                "academic_year": cls.academic_year,
                "division": cls.division,
                "createdAt": cls.createdAt,
                "updatedAt": cls.updatedAt,
                "timetable": [
                    {
                        "id": s.id,
                        "class_id": s.class_id,
                        "day_of_week": s.day_of_week,
                        "subject_name": s.subject_name,
                        "start_time": s.start_time,
                        "end_time": s.end_time
                    } for s in cls.timetable
                ],
                "students": [
                    {
                        "id": stu.id,
                        "name": stu.name,
                        "email": stu.email,
                        "role": stu.role.value
                    } for stu in cls.students
                ],
                "_count": {
                    "students": len(cls.students)
                }
            })
        return result
    except Exception as e:
        print("List classes error:", e)
        raise HTTPException(status_code=500, detail="Failed to retrieve classes.")

@router.post("/classes", status_code=status.HTTP_201_CREATED)
def create_class(payload: ClassCreateRequest, db: Session = Depends(get_db)):
    stream = payload.stream.strip()
    academic_year = payload.academic_year.strip()
    division = payload.division.strip()

    if not stream or not academic_year or not division:
        raise HTTPException(status_code=400, detail="Missing required fields: stream, academic_year, division.")

    # Unique code generation with retry logic
    class_code = ""
    is_unique = False
    retries = 0
    max_retries = 10

    while not is_unique and retries < max_retries:
        class_code = generate_class_code()
        existing = db.query(Class).filter(Class.class_code == class_code).first()
        if not existing:
            is_unique = True
        else:
            retries += 1

    if not is_unique:
        raise HTTPException(status_code=500, detail="Failed to generate a unique class code. Please try again.")

    new_class = Class(
        class_code=class_code,
        stream=stream,
        academic_year=academic_year,
        division=division
    )

    try:
        db.add(new_class)
        db.commit()
        db.refresh(new_class)
        return {
            "id": new_class.id,
            "class_code": new_class.class_code,
            "stream": new_class.stream,
            "academic_year": new_class.academic_year,
            "division": new_class.division
        }
    except Exception as e:
        db.rollback()
        print("Create class error:", e)
        raise HTTPException(status_code=500, detail="Internal server error creating class.")

@router.put("/classes/{class_id}")
def update_class(class_id: str, payload: ClassCreateRequest, db: Session = Depends(get_db)):
    stream = payload.stream.strip()
    academic_year = payload.academic_year.strip()
    division = payload.division.strip()

    if not stream or not academic_year or not division:
        raise HTTPException(status_code=400, detail="Missing required fields: stream, academic_year, division.")

    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found.")

    try:
        cls.stream = stream
        cls.academic_year = academic_year
        cls.division = division
        db.commit()
        db.refresh(cls)

        return {
            "id": cls.id,
            "class_code": cls.class_code,
            "stream": cls.stream,
            "academic_year": cls.academic_year,
            "division": cls.division,
            "timetable": [
                {
                    "id": s.id,
                    "class_id": s.class_id,
                    "day_of_week": s.day_of_week,
                    "subject_name": s.subject_name,
                    "start_time": s.start_time,
                    "end_time": s.end_time
                } for s in cls.timetable
            ],
            "students": [
                {
                    "id": stu.id,
                    "name": stu.name,
                    "email": stu.email,
                    "role": stu.role.value
                } for stu in cls.students
            ],
            "_count": {
                "students": len(cls.students)
            }
        }
    except Exception as e:
        db.rollback()
        print("Update class error:", e)
        raise HTTPException(status_code=500, detail="Failed to update class details.")

@router.delete("/classes/{class_id}/students/{student_id}")
def remove_student(class_id: str, student_id: str, db: Session = Depends(get_db)):
    student = db.query(User).filter(User.id == student_id, User.class_id == class_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found in this class.")

    try:
        student.class_id = None
        db.commit()
        return {"message": "Student removed from class successfully."}
    except Exception as e:
        db.rollback()
        print("Remove student error:", e)
        raise HTTPException(status_code=500, detail="Failed to remove student from class.")

@router.post("/timetable/{class_id}")
def save_timetable(class_id: str, payload: TimetableSaveRequest, db: Session = Depends(get_db)):
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found.")

    valid_days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    time_regex = re.compile(r"^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$")

    for slot in payload.slots:
        if slot.day_of_week not in valid_days:
            raise HTTPException(status_code=400, detail=f"Invalid day of week. Must be one of: {', '.join(valid_days)}.")
        if not time_regex.match(slot.start_time) or not time_regex.match(slot.end_time):
            raise HTTPException(status_code=400, detail="Times must be in valid HH:MM format.")

    try:
        # Reset and rebuild the timetable in transaction
        db.query(TimetableSlot).filter(TimetableSlot.class_id == class_id).delete()
        for slot in payload.slots:
            new_slot = TimetableSlot(
                class_id=class_id,
                day_of_week=slot.day_of_week,
                subject_name=slot.subject_name,
                start_time=slot.start_time,
                end_time=slot.end_time
            )
            db.add(new_slot)
        
        db.commit()

        updated_slots = db.query(TimetableSlot).filter(TimetableSlot.class_id == class_id).order_by(
            TimetableSlot.day_of_week.asc(), TimetableSlot.start_time.asc()
        ).all()

        return {
            "message": "Timetable updated successfully.",
            "slots": [
                {
                    "id": s.id,
                    "class_id": s.class_id,
                    "day_of_week": s.day_of_week,
                    "subject_name": s.subject_name,
                    "start_time": s.start_time,
                    "end_time": s.end_time
                } for s in updated_slots
            ]
        }
    except Exception as e:
        db.rollback()
        print("Timetable sync error:", e)
        raise HTTPException(status_code=500, detail="Failed to update timetable.")
