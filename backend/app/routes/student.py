from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Class, User, Role
from app.schemas import JoinClassRequest, UpdateBatchRequest
from app.auth_utils import get_current_user

router = APIRouter(prefix="/student", tags=["Student Features"])

@router.post("/join")
def join_class(payload: JoinClassRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != Role.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can join classes."
        )

    class_code = payload.class_code.strip().upper()
    cls = db.query(Class).filter(Class.class_code == class_code).first()
    
    if not cls:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class code not found."
        )

    try:
        current_user.class_id = cls.id
        db.commit()
        db.refresh(current_user)
        
        return {
            "message": "Successfully joined class.",
            "class": {
                "id": cls.id,
                "class_code": cls.class_code,
                "stream": cls.stream,
                "academic_year": cls.academic_year,
                "division": cls.division
            }
        }
    except Exception as e:
        db.rollback()
        print("Join class error:", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to join class."
        )

@router.put("/batch")
def update_batch(payload: UpdateBatchRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != Role.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can customize their batch."
        )

    try:
        batch_val = payload.batch.strip().upper() if payload.batch else None
        current_user.batch = batch_val
        db.commit()
        db.refresh(current_user)
        return {"message": "Batch updated successfully.", "batch": current_user.batch}
    except Exception as e:
        db.rollback()
        print("Update batch error:", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update batch."
        )
