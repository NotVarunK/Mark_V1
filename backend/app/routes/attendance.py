import os
import math
from datetime import datetime, date as date_type, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Class, TimetableSlot, AttendanceLog, User, Role, AttendanceStatus, Holiday
from app.schemas import CheckinRequest
from app.auth_utils import get_current_user

router = APIRouter(prefix="/attendance", tags=["Attendance & Check-in"])

TERM_START_DATE = date_type(2026, 3, 1)
CAMPUS_LAT = 18.5255
CAMPUS_LON = 73.8368
MAX_DISTANCE_METERS = 100

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def count_days_between(start_date: date_type, end_date: date_type, target_day_name: str) -> int:
    days_map = {
        "Sunday": 6, "Monday": 0, "Tuesday": 1, "Wednesday": 2,
        "Thursday": 3, "Friday": 4, "Saturday": 5
    }
    target_weekday = days_map.get(target_day_name)
    if target_weekday is None:
        return 0
        
    count = 0
    curr = start_date
    while curr <= end_date:
        if curr.weekday() == target_weekday:
            count += 1
        curr += timedelta(days=1)
    return count

def count_conducted_lectures(db: Session, start_date: date_type, end_date: date_type, target_day_name: str) -> int:
    days_map = {
        "Sunday": 6, "Monday": 0, "Tuesday": 1, "Wednesday": 2,
        "Thursday": 3, "Friday": 4, "Saturday": 5
    }
    target_weekday = days_map.get(target_day_name)
    if target_weekday is None:
        return 0
        
    raw_count = 0
    curr = start_date
    while curr <= end_date:
        if curr.weekday() == target_weekday:
            raw_count += 1
        curr += timedelta(days=1)
        
    holidays = db.query(Holiday).filter(
        Holiday.date >= start_date,
        Holiday.date <= end_date
    ).all()
    
    holiday_deductions = 0
    for h in holidays:
        if h.date.weekday() == target_weekday:
            holiday_deductions += 1
            
    return max(0, raw_count - holiday_deductions)

@router.post("/checkin", status_code=status.HTTP_201_CREATED)
def checkin(payload: CheckinRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != Role.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can check in."
        )

    if not current_user.class_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are not enrolled in any class."
        )

    # Check if slot exists
    slot = db.query(TimetableSlot).filter(
        TimetableSlot.id == payload.slotId,
        TimetableSlot.class_id == current_user.class_id
    ).first()
    
    if not slot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lecture slot not found or does not belong to your class."
        )

    # Validate Geofencing unless bypassed in environment
    disable_geofence = os.getenv("DISABLE_GEOFENCE") == "true"
    if not disable_geofence:
        if payload.lat is None or payload.lng is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Location coordinates (lat, lng) are required."
            )
        distance = haversine_distance(payload.lat, payload.lng, CAMPUS_LAT, CAMPUS_LON)
        if distance > MAX_DISTANCE_METERS:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Check-in failed: You must be physically present on campus. Current distance: {round(distance)}m"
            )

    checkin_date = date_type.today()
    if payload.date:
        try:
            checkin_date = datetime.strptime(payload.date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Must be YYYY-MM-DD."
            )

    # Check if this date is a holiday
    holiday = db.query(Holiday).filter(Holiday.date == checkin_date).first()
    if holiday:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Check-in disabled. Today is a declared holiday: {holiday.name}."
        )

    # Check if already checked in (to return 409 Conflict)
    log = db.query(AttendanceLog).filter(
        AttendanceLog.student_id == current_user.id,
        AttendanceLog.slot_id == slot.id,
        AttendanceLog.date == checkin_date
    ).first()

    if log:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already checked in for this slot."
        )

    # Proxy fingerprint protection check
    if payload.device_fingerprint:
        existing_proxy = db.query(AttendanceLog).filter(
            AttendanceLog.slot_id == slot.id,
            AttendanceLog.date == checkin_date,
            AttendanceLog.device_fingerprint == payload.device_fingerprint,
            AttendanceLog.student_id != current_user.id
        ).first()

        if existing_proxy:
            other_user = db.query(User).filter(User.id == existing_proxy.student_id).first()
            other_name = other_user.name if other_user else "another student"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Proxy check-in detected. This device has already been used by {other_name} to check in for this slot."
            )

    try:
        log = AttendanceLog(
            student_id=current_user.id,
            slot_id=slot.id,
            date=checkin_date,
            status=AttendanceStatus.PRESENT,
            device_fingerprint=payload.device_fingerprint
        )
        db.add(log)
        db.commit()
        
        # Return response matching Express backend status code 201 for new checkins
        return {"message": "Check-in successful.", "status": "PRESENT"}
    except Exception as e:
        db.rollback()
        print("Check-in database error:", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record check-in."
        )

def is_slot_for_student_batch(subject_name: str, student_batch: str) -> bool:
    if not student_batch:
        return True
    
    subject_lower = subject_name.lower()
    student_batch_lower = student_batch.lower()
    
    # Check for all standard batches
    all_batches = ["b1", "b2", "b3", "a1", "a2", "ai", "c1", "c2"]
    mentioned_batches = [b for b in all_batches if b in subject_lower]
    
    # If no batches are mentioned in the subject, it is a general lecture for everyone
    if not mentioned_batches:
        return True
        
    return student_batch_lower in mentioned_batches

@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != Role.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students have access to the dashboard stats."
        )

    if not current_user.class_id:
        return {
            "overall": {"attended": 0, "conducted": 0, "pct": 0.0},
            "subjects": [],
            "leaderboard": [],
            "classInsights": {
                "avgClassPct": 0.0,
                "bestSubject": "N/A",
                "worstSubject": "N/A"
            },
            "logs": []
        }

    # 1. Retrieve all class timetable slots and filter by current user's batch
    slots = db.query(TimetableSlot).filter(TimetableSlot.class_id == current_user.class_id).all()
    student_slots = [s for s in slots if is_slot_for_student_batch(s.subject_name, current_user.batch)]
    
    today = date_type.today()
    
    # Group slot data by subject name to compute counts
    subject_stats = {}
    total_conducted = 0
    total_attended = 0

    for slot in student_slots:
        conducted = count_conducted_lectures(db, TERM_START_DATE, today, slot.day_of_week)
        attended = db.query(AttendanceLog).filter(
            AttendanceLog.student_id == current_user.id,
            AttendanceLog.slot_id == slot.id,
            AttendanceLog.status == AttendanceStatus.PRESENT
        ).count()

        # In case dates out of bounds:
        if conducted < attended:
            conducted = attended

        subj_name = slot.subject_name
        if subj_name not in subject_stats:
            subject_stats[subj_name] = {"conducted": 0, "attended": 0}
            
        subject_stats[subj_name]["conducted"] += conducted
        subject_stats[subj_name]["attended"] += attended
        total_conducted += conducted
        total_attended += attended

    # Format subject-wise statistics list
    subjects_list = []
    for name, stats in subject_stats.items():
        pct = round((stats["attended"] / stats["conducted"] * 100), 1) if stats["conducted"] > 0 else 0.0
        subjects_list.append({
            "name": name,
            "conducted": stats["conducted"],
            "attended": stats["attended"],
            "pct": pct
        })

    overall_pct = round((total_attended / total_conducted * 100), 1) if total_conducted > 0 else 0.0

    # 2. Fetch all students in the class to compute Leaderboard and Class Health
    students = db.query(User).filter(
        User.class_id == current_user.class_id,
        User.role == Role.STUDENT
    ).all()

    # Calculate details for each student on their respective batch-specific timetable slots
    leaderboard_list = []
    for student in students:
        # Filter slots relevant to this student's batch
        student_slots = [s for s in slots if is_slot_for_student_batch(s.subject_name, student.batch)]
        
        # Calculate conducted slots count for this student
        student_conducted = 0
        for slot in student_slots:
            student_conducted += count_conducted_lectures(db, TERM_START_DATE, today, slot.day_of_week)
            
        # Find attendance logs marked PRESENT for this student for their batch slots
        student_slots_ids = {s.id for s in student_slots}
        student_attended = db.query(AttendanceLog).filter(
            AttendanceLog.student_id == student.id,
            AttendanceLog.slot_id.in_(student_slots_ids) if student_slots_ids else False,
            AttendanceLog.status == AttendanceStatus.PRESENT
        ).count()
        
        if student_conducted < student_attended:
            student_conducted = student_attended
            
        pct = round((student_attended / student_conducted * 100), 1) if student_conducted > 0 else 0.0
        leaderboard_list.append({
            "studentId": student.id,
            "name": student.name,
            "pct": pct
        })

    # Sort leaderboard by percentage descending
    leaderboard_list.sort(key=lambda x: x["pct"], reverse=True)

    # 3. Class Insights: overall class average, best subject, worst subject
    avg_class_pct = round(sum(stu["pct"] for stu in leaderboard_list) / len(leaderboard_list), 1) if leaderboard_list else 0.0

    # Subject performance class-wide (based on batch matching)
    subject_class_map = {}
    for slot in slots:
        subj_name = slot.subject_name
        if subj_name not in subject_class_map:
            subject_class_map[subj_name] = {"attended": 0, "conducted": 0}
            
        # Count how many students in the class belong to a batch that is allowed for this slot
        matching_students_count = sum(1 for stu in students if is_slot_for_student_batch(slot.subject_name, stu.batch))
        conducted_occurrences = count_conducted_lectures(db, TERM_START_DATE, today, slot.day_of_week)
        subject_class_map[subj_name]["conducted"] += conducted_occurrences * matching_students_count

    # Gather all logs for all students in this class
    all_class_logs = db.query(AttendanceLog).join(User).filter(
        User.class_id == current_user.class_id,
        AttendanceLog.status == AttendanceStatus.PRESENT
    ).all()
    
    for log in all_class_logs:
        # Find slot name
        slot = db.query(TimetableSlot).filter(TimetableSlot.id == log.slot_id).first()
        if slot and slot.subject_name in subject_class_map:
            subject_class_map[slot.subject_name]["attended"] += 1

    best_subject = "N/A"
    worst_subject = "N/A"
    max_subj_pct = -1.0
    min_subj_pct = 101.0

    for subj, stats in subject_class_map.items():
        if stats["conducted"] > 0:
            pct = (stats["attended"] / stats["conducted"]) * 100
            if pct > max_subj_pct:
                max_subj_pct = pct
                best_subject = subj
            if pct < min_subj_pct:
                min_subj_pct = pct
                worst_subject = subj

    # Retrieve all student attendance logs
    logs = db.query(AttendanceLog).filter(AttendanceLog.student_id == current_user.id).all()

    return {
        "overall": {
            "conducted": total_conducted,
            "attended": total_attended,
            "pct": overall_pct
        },
        "subjects": subjects_list,
        "leaderboard": leaderboard_list,
        "classInsights": {
            "avgClassPct": avg_class_pct,
            "bestSubject": best_subject,
            "worstSubject": worst_subject
        },
        "logs": [
            {
                "id": log.id,
                "student_id": log.student_id,
                "slot_id": log.slot_id,
                "date": log.date.isoformat(),
                "status": log.status.value
            } for log in logs
        ]
    }

@router.get("/holidays")
def get_holidays_public(db: Session = Depends(get_db)):
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
        print("Get public holidays error:", e)
        raise HTTPException(status_code=500, detail="Failed to retrieve holidays.")
