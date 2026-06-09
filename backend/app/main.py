import os
import uvicorn
from datetime import datetime
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Import routers
from app.routes.auth import router as auth_router
from app.routes.admin import router as admin_router
from app.routes.student import router as student_router
from app.routes.attendance import router as attendance_router

# Import seed function
from app.seed import seed_db

app = FastAPI(title="Mark_V1 API")

# Configure CORS to allow sharing credentials for session cookies
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
origins = [origin.strip() for origin in frontend_url.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Custom exception handler for HTTPException to align responses with React expectations
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict):
        content = detail.copy()
        if "message" in content and "error" not in content:
            content["error"] = content["message"]
        elif "error" in content and "message" not in content:
            content["message"] = content["error"]
    else:
        content = {"error": str(detail), "message": str(detail)}
        
    return JSONResponse(
        status_code=exc.status_code,
        content=content
    )

# Mount routes under the /api prefix as expected by the frontend
app.include_router(auth_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(student_router, prefix="/api")
app.include_router(attendance_router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "OK", "time": datetime.utcnow().isoformat()}

# Startup handler to trigger DB seeding and schedule hourly background cron jobs
@app.on_event("startup")
def on_startup():
    # 1. Run database initialization & seed
    print("Running database initialization and seeding...")
    try:
        seed_db()
    except Exception as e:
        print("Database seeding on startup failed:", e)

    # 2. Setup Background Scheduler for hourly reminders
    print("Initializing Background Scheduler...")
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from app.database import SessionLocal
        from app.models import TimetableSlot, AttendanceLog, User, Role
        from datetime import date as date_type
        
        def run_cron_nudges():
            print("[CRON] Running hourly attendance check-in reminders...")
            db = SessionLocal()
            try:
                now = datetime.now()
                days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
                # Python's strftime("%A") will yield the day name matching days list (e.g. 'Monday')
                current_day = now.strftime("%A")
                
                if current_day == 'Sunday':
                    return
                    
                now_hours = now.hour
                now_minutes = now.minute
                now_total_minutes = now_hours * 60 + now_minutes
                
                slots = db.query(TimetableSlot).filter(TimetableSlot.day_of_week == current_day).all()
                today_date = date_type.today()
                
                for slot in slots:
                    try:
                        end_hour, end_min = map(int, slot.end_time.split(':'))
                    except ValueError:
                        continue
                        
                    slot_end_total_minutes = end_hour * 60 + end_min
                    time_diff = now_total_minutes - slot_end_total_minutes
                    
                    if 0 <= time_diff <= 15:
                        print(f"[CRON] Found slot {slot.subject_name} ({slot.start_time} - {slot.end_time}) which ended {time_diff} mins ago.")
                        
                        # Find attendance logs marked PRESENT today
                        attended_logs = db.query(AttendanceLog).filter(
                            AttendanceLog.slot_id == slot.id,
                            AttendanceLog.date == today_date,
                            AttendanceLog.status == 'PRESENT'
                        ).all()
                        attended_student_ids = {log.student_id for log in attended_logs}
                        
                        # Find students in the class
                        students = db.query(User).filter(
                            User.class_id == slot.class_id,
                            User.role == Role.STUDENT
                        ).all()
                        
                        for student in students:
                            if student.id not in attended_student_ids:
                                print(f"[CRON NOTIFICATION] Send nudge to {student.name}: Forgot to mark attendance for {slot.subject_name}?")
            except Exception as e:
                print("[CRON ERROR] Failed to run attendance reminders:", e)
            finally:
                db.close()
                
        scheduler = BackgroundScheduler()
        # Run every hour on the hour
        scheduler.add_job(run_cron_nudges, 'cron', minute=0)
        scheduler.start()
        print("[CRON] Attendance reminder cron job scheduled (every hour).")
    except Exception as e:
        print("[CRON ERROR] Failed to initialize scheduler:", e)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"=========================================")
    print(f"  CheckIn Backend Server Running on:     ")
    print(f"  http://localhost:{port}               ")
    print(f"=========================================")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
