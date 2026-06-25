import re
import random
import string
import io
import csv
from datetime import date as date_type, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Class, TimetableSlot, User, Role, AttendanceLog, AttendanceStatus, Holiday, ScheduleAdjustment
from app.schemas import ClassCreateRequest, TimetableSaveRequest, AttendanceOverrideRequest, HolidayCreateRequest, AdjustmentCreateRequest
from app.auth_utils import require_role
from app.routes.attendance import TERM_START_DATE, count_conducted_lectures, is_slot_for_student_batch, get_student_attendance_summary

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
        # Load existing slots
        existing_slots = db.query(TimetableSlot).filter(TimetableSlot.class_id == class_id).all()
        existing_map = {s.id: s for s in existing_slots}
        sent_ids = set()

        for slot_schema in payload.slots:
            if slot_schema.id and slot_schema.id in existing_map:
                # Update existing slot
                slot_obj = existing_map[slot_schema.id]
                slot_obj.day_of_week = slot_schema.day_of_week
                slot_obj.subject_name = slot_schema.subject_name
                slot_obj.start_time = slot_schema.start_time
                slot_obj.end_time = slot_schema.end_time
                sent_ids.add(slot_schema.id)
            else:
                # Create new slot
                new_slot = TimetableSlot(
                    class_id=class_id,
                    day_of_week=slot_schema.day_of_week,
                    subject_name=slot_schema.subject_name,
                    start_time=slot_schema.start_time,
                    end_time=slot_schema.end_time
                )
                db.add(new_slot)
        
        # Delete slots that were not sent in the payload
        for old_id, old_slot in existing_map.items():
            if old_id not in sent_ids:
                db.delete(old_slot)
        
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

@router.get("/classes/{class_id}/export")
def export_class_attendance(class_id: str, db: Session = Depends(get_db)):
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found.")

    students = db.query(User).filter(
        User.class_id == class_id,
        User.role == Role.STUDENT
    ).order_by(User.name.asc()).all()

    slots = db.query(TimetableSlot).filter(TimetableSlot.class_id == class_id).all()
    today = date_type.today()

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header row
    writer.writerow([
        "Student Name", 
        "Student Email", 
        "Student Batch", 
        "Subject Name", 
        "Conducted Lectures", 
        "Attended Lectures", 
        "Attendance Percentage"
    ])

    for student in students:
        student_slots = [s for s in slots if is_slot_for_student_batch(s.subject_name, student.batch)]
        subject_stats = get_student_attendance_summary(db, student.id, class_id, student_slots, today)

        # If student has no timetable slots at all
        if not subject_stats:
            writer.writerow([
                student.name,
                student.email,
                student.batch or "N/A",
                "No slots found",
                0,
                0,
                "0.0%"
            ])
        else:
            for name, stats in subject_stats.items():
                pct = round((stats["attended"] / stats["conducted"] * 100), 1) if stats["conducted"] > 0 else 0.0
                writer.writerow([
                    student.name,
                    student.email,
                    student.batch or "N/A",
                    name,
                    stats["conducted"],
                    stats["attended"],
                    f"{pct}%"
                ])

    # Seek to start
    output.seek(0)
    
    # Return as StreamingResponse
    headers = {
        'Content-Disposition': f'attachment; filename="attendance_report_{cls.class_code}.csv"'
    }
    return StreamingResponse(output, media_type="text/csv", headers=headers)

@router.get("/classes/{class_id}/attendance")
def get_class_attendance_roster(class_id: str, date: str, slot_id: str, db: Session = Depends(get_db)):
    try:
        try:
            target_date = datetime.strptime(date.strip(), "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

        cls = db.query(Class).filter(Class.id == class_id).first()
        if not cls:
            raise HTTPException(status_code=404, detail="Class not found.")

        slot = db.query(TimetableSlot).filter(TimetableSlot.id == slot_id, TimetableSlot.class_id == class_id).first()
        if not slot:
            raise HTTPException(status_code=404, detail="Timetable slot not found for this class.")

        students = db.query(User).filter(
            User.class_id == class_id,
            User.role == Role.STUDENT
        ).order_by(User.name.asc()).all()

        logs = db.query(AttendanceLog).filter(
            AttendanceLog.slot_id == slot_id,
            AttendanceLog.date == target_date
        ).all()
        
        logs_map = {log.student_id: log.status.value for log in logs}

        result = []
        for s in students:
            is_applicable = is_slot_for_student_batch(slot.subject_name, s.batch)
            result.append({
                "id": s.id,
                "name": s.name,
                "email": s.email,
                "batch": s.batch,
                "status": logs_map.get(s.id, None),
                "is_applicable": is_applicable
            })

        return result
    except HTTPException:
        raise
    except Exception as e:
        print("Get class attendance roster error:", e)
        raise HTTPException(status_code=500, detail="Failed to retrieve class attendance roster.")

@router.post("/attendance/override")
def override_attendance(payload: AttendanceOverrideRequest, db: Session = Depends(get_db)):
    try:
        try:
            target_date = datetime.strptime(payload.date.strip(), "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

        status_upper = payload.status.strip().upper()
        if status_upper not in ["PRESENT", "ABSENT"]:
            raise HTTPException(status_code=400, detail="Status must be either 'PRESENT' or 'ABSENT'.")

        student = db.query(User).filter(User.id == payload.student_id, User.role == Role.STUDENT).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found.")

        slot = db.query(TimetableSlot).filter(TimetableSlot.id == payload.slot_id).first()
        if not slot:
            raise HTTPException(status_code=404, detail="Timetable slot not found.")

        log = db.query(AttendanceLog).filter(
            AttendanceLog.student_id == payload.student_id,
            AttendanceLog.slot_id == payload.slot_id,
            AttendanceLog.date == target_date
        ).first()

        if log:
            log.status = AttendanceStatus[status_upper]
            log.updatedAt = func.now()
        else:
            log = AttendanceLog(
                student_id=payload.student_id,
                slot_id=payload.slot_id,
                date=target_date,
                status=AttendanceStatus[status_upper]
            )
            db.add(log)

        db.commit()
        return {"message": f"Attendance successfully overridden to {status_upper}."}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print("Override attendance error:", e)
        raise HTTPException(status_code=500, detail="Failed to override attendance.")

@router.get("/holidays")
def get_holidays(db: Session = Depends(get_db)):
    try:
        holidays = db.query(Holiday).order_by(Holiday.date.asc()).all()
        return [
            {
                "id": h.id,
                "date": h.date.isoformat(),
                "name": h.name
            } for h in holidays
        ]
    except Exception as e:
        print("Get holidays error:", e)
        raise HTTPException(status_code=500, detail="Failed to retrieve holidays.")

@router.post("/holidays", status_code=status.HTTP_201_CREATED)
def create_holiday(payload: HolidayCreateRequest, db: Session = Depends(get_db)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Holiday name is required.")

    try:
        holiday_date = datetime.strptime(payload.date.strip(), "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

    existing = db.query(Holiday).filter(Holiday.date == holiday_date).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"A holiday is already declared for {holiday_date} ({existing.name}).")

    new_holiday = Holiday(
        date=holiday_date,
        name=name
    )

    try:
        db.add(new_holiday)
        db.commit()
        db.refresh(new_holiday)
        return {
            "id": new_holiday.id,
            "date": new_holiday.date.isoformat(),
            "name": new_holiday.name
        }
    except Exception as e:
        db.rollback()
        print("Create holiday error:", e)
        raise HTTPException(status_code=500, detail="Failed to declare holiday.")

@router.delete("/holidays/{holiday_id}")
def delete_holiday(holiday_id: str, db: Session = Depends(get_db)):
    holiday = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found.")

    try:
        db.delete(holiday)
        db.commit()
        return {"message": "Holiday deleted successfully."}
    except Exception as e:
        db.rollback()
        print("Delete holiday error:", e)
        raise HTTPException(status_code=500, detail="Failed to delete holiday.")

@router.get("/classes/{class_id}/analytics")
def get_class_analytics(class_id: str, db: Session = Depends(get_db)):
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found.")

    students = db.query(User).filter(
        User.class_id == class_id,
        User.role == Role.STUDENT
    ).all()

    slots = db.query(TimetableSlot).filter(TimetableSlot.class_id == class_id).all()
    today = date_type.today()

    student_stats = []
    total_class_conducted = 0
    total_class_attended = 0
    
    subject_aggregate = {} # subject_name -> {"conducted": 0, "attended": 0}

    for student in students:
        student_slots = [s for s in slots if is_slot_for_student_batch(s.subject_name, student.batch)]
        summary = get_student_attendance_summary(db, student.id, class_id, student_slots, today)
        
        student_conducted = sum(x["conducted"] for x in summary.values())
        student_attended = sum(x["attended"] for x in summary.values())
        
        # Aggregate subject performance class-wide
        for sub_name, stats in summary.items():
            if sub_name not in subject_aggregate:
                subject_aggregate[sub_name] = {"conducted": 0, "attended": 0}
            subject_aggregate[sub_name]["conducted"] += stats["conducted"]
            subject_aggregate[sub_name]["attended"] += stats["attended"]

        pct = round((student_attended / student_conducted * 100), 1) if student_conducted > 0 else 0.0
        
        student_stats.append({
            "id": student.id,
            "name": student.name,
            "email": student.email,
            "batch": student.batch,
            "conducted": student_conducted,
            "attended": student_attended,
            "pct": pct
        })
        
        total_class_conducted += student_conducted
        total_class_attended += student_attended

    class_avg = round((total_class_attended / total_class_conducted * 100), 1) if total_class_conducted > 0 else 0.0

    # Format subject stats
    subjects_stats = []
    for name, stats in subject_aggregate.items():
        sub_pct = round((stats["attended"] / stats["conducted"] * 100), 1) if stats["conducted"] > 0 else 0.0
        subjects_stats.append({
            "name": name,
            "pct": sub_pct,
            "conducted": stats["conducted"],
            "attended": stats["attended"]
        })

    # Sort students by percentage descending
    student_stats.sort(key=lambda x: x["pct"], reverse=True)
    
    # At-risk students are those below 75%
    at_risk = [s for s in student_stats if s["pct"] < 75.0]

    return {
        "class_avg": class_avg,
        "total_students": len(students),
        "student_stats": student_stats,
        "subjects_stats": subjects_stats,
        "at_risk": at_risk
    }

@router.get("/classes/{class_id}/adjustments")
def get_schedule_adjustments(class_id: str, db: Session = Depends(get_db)):
    try:
        adjustments = db.query(ScheduleAdjustment).filter(ScheduleAdjustment.class_id == class_id).all()
        return [
            {
                "id": a.id,
                "class_id": a.class_id,
                "slot_id": a.slot_id,
                "date": a.date.isoformat(),
                "is_cancelled": a.is_cancelled,
                "replaced_subject": a.replaced_subject,
                "slot": {
                    "subject_name": a.slot.subject_name,
                    "day_of_week": a.slot.day_of_week,
                    "start_time": a.slot.start_time,
                    "end_time": a.slot.end_time
                } if a.slot else None
            } for a in adjustments
        ]
    except Exception as e:
        print("Get schedule adjustments error:", e)
        raise HTTPException(status_code=500, detail="Failed to retrieve schedule adjustments.")

@router.post("/adjustments", status_code=status.HTTP_201_CREATED)
def create_schedule_adjustment(payload: AdjustmentCreateRequest, db: Session = Depends(get_db)):
    try:
        target_date = datetime.strptime(payload.date.strip(), "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

    slot = db.query(TimetableSlot).filter(TimetableSlot.id == payload.slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Timetable slot not found.")

    # Check if weekday matches
    days_map = {
        "Sunday": 6, "Monday": 0, "Tuesday": 1, "Wednesday": 2,
        "Thursday": 3, "Friday": 4, "Saturday": 5
    }
    target_weekday = days_map.get(slot.day_of_week)
    if target_weekday is not None and target_date.weekday() != target_weekday:
        raise HTTPException(
            status_code=400, 
            detail=f"Adjustment date {target_date} ({target_date.strftime('%A')}) does not match the slot's scheduled day: {slot.day_of_week}."
        )

    # Check if already exists
    existing = db.query(ScheduleAdjustment).filter(
        ScheduleAdjustment.slot_id == payload.slot_id,
        ScheduleAdjustment.date == target_date
    ).first()

    if existing:
        existing.is_cancelled = payload.is_cancelled
        existing.replaced_subject = payload.replaced_subject.strip() if payload.replaced_subject else None
        db.commit()
        db.refresh(existing)
        return {"message": "Schedule adjustment updated successfully.", "id": existing.id}

    new_adj = ScheduleAdjustment(
        class_id=payload.class_id,
        slot_id=payload.slot_id,
        date=target_date,
        is_cancelled=payload.is_cancelled,
        replaced_subject=payload.replaced_subject.strip() if payload.replaced_subject else None
    )

    try:
        db.add(new_adj)
        db.commit()
        db.refresh(new_adj)
        return {"message": "Schedule adjustment created successfully.", "id": new_adj.id}
    except Exception as e:
        db.rollback()
        print("Create schedule adjustment error:", e)
        raise HTTPException(status_code=500, detail="Failed to create schedule adjustment.")

@router.delete("/adjustments/{adjustment_id}")
def delete_schedule_adjustment(adjustment_id: str, db: Session = Depends(get_db)):
    adj = db.query(ScheduleAdjustment).filter(ScheduleAdjustment.id == adjustment_id).first()
    if not adj:
        raise HTTPException(status_code=404, detail="Schedule adjustment not found.")

    try:
        db.delete(adj)
        db.commit()
        return {"message": "Schedule adjustment deleted successfully."}
    except Exception as e:
        db.rollback()
        print("Delete schedule adjustment error:", e)
        raise HTTPException(status_code=500, detail="Failed to delete schedule adjustment.")
