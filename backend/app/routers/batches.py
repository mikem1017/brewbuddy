from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from .. import models, schemas, auth
from ..database import get_db
from ..controllers.temperature_controller import temperature_controller

router = APIRouter(prefix="/api/batches", tags=["batches"])


def generate_batch_number(db: Session) -> str:
    """Generate unique batch number: BATCH-YYYYMMDD-XXX"""
    today = datetime.now().strftime("%Y%m%d")
    prefix = f"BATCH-{today}-"
    
    # Find highest number for today
    existing = db.query(models.Batch).filter(
        models.Batch.batch_number.like(f"{prefix}%")
    ).all()
    
    if not existing:
        return f"{prefix}001"
    
    numbers = [int(b.batch_number.split("-")[-1]) for b in existing]
    next_num = max(numbers) + 1
    return f"{prefix}{next_num:03d}"


@router.get("/", response_model=List[schemas.Batch])
def list_batches(
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all batches, optionally filtered by status."""
    query = db.query(models.Batch)
    if status:
        query = query.filter(models.Batch.status == status)
    return query.order_by(models.Batch.created_at.desc()).all()


@router.get("/{batch_id}", response_model=schemas.BatchWithDetails)
def get_batch(
    batch_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific batch with details."""
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


@router.post("/", response_model=schemas.Batch)
def create_batch(
    batch: schemas.BatchCreate,
    db: Session = Depends(get_db)
):
    """Create a new batch."""
    # Verify fermenter exists and is available
    fermenter = db.query(models.Fermenter).filter(models.Fermenter.id == batch.fermenter_id).first()
    if not fermenter:
        raise HTTPException(status_code=404, detail="Fermenter not found")
    
    # Check if fermenter is already in use
    active_batch = db.query(models.Batch).filter(
        models.Batch.fermenter_id == batch.fermenter_id,
        models.Batch.status.in_(["active", "scheduled"])
    ).first()
    
    if active_batch:
        raise HTTPException(
            status_code=400,
            detail=f"Fermenter already in use by batch {active_batch.batch_number}"
        )
    
    # Verify profile exists
    profile = db.query(models.BeerProfile).filter(models.BeerProfile.id == batch.profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Generate batch number
    batch_number = generate_batch_number(db)
    
    # Create batch
    db_batch = models.Batch(
        **batch.model_dump(),
        batch_number=batch_number,
        status="scheduled",
        created_by_user_id=current_user.id
    )
    db.add(db_batch)
    db.commit()
    db.refresh(db_batch)
    return db_batch


@router.put("/{batch_id}", response_model=schemas.Batch)
def update_batch(
    batch_id: int,
    batch_update: schemas.BatchUpdate,
    db: Session = Depends(get_db)
):
    """Update a batch."""
    db_batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not db_batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    update_data = batch_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_batch, field, value)
    
    db.commit()
    db.refresh(db_batch)
    return db_batch


@router.post("/{batch_id}/start")
def start_batch(
    batch_id: int,
    db: Session = Depends(get_db)
):
    """Start a batch (begin fermentation)."""
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    if batch.status == "active":
        raise HTTPException(status_code=400, detail="Batch already active")
    
    if batch.status not in ["scheduled", "cancelled"]:
        raise HTTPException(status_code=400, detail="Batch cannot be started")
    
    # Update batch status
    batch.status = "active"
    batch.start_time = datetime.utcnow()
    
    # Update fermenter status
    fermenter = db.query(models.Fermenter).filter(models.Fermenter.id == batch.fermenter_id).first()
    if fermenter:
        fermenter.status = "in_use"
    
    db.commit()
    return {"message": "Batch started successfully", "batch_number": batch.batch_number}


@router.post("/{batch_id}/stop")
def stop_batch(
    batch_id: int,
    db: Session = Depends(get_db)
):
    """Stop a batch (complete fermentation)."""
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    if batch.status != "active":
        raise HTTPException(status_code=400, detail="Batch is not active")
    
    # Update batch status
    batch.status = "complete"
    batch.end_time = datetime.utcnow()
    
    # Update fermenter status
    fermenter = db.query(models.Fermenter).filter(models.Fermenter.id == batch.fermenter_id).first()
    if fermenter:
        fermenter.status = "needs_cleaning"
    
    db.commit()
    return {"message": "Batch stopped successfully", "batch_number": batch.batch_number}


@router.get("/{batch_id}/logs", response_model=List[schemas.TemperatureLog])
def get_batch_logs(
    batch_id: int,
    limit: int = Query(1000, le=10000),
    hours: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get temperature logs for a batch."""
    query = db.query(models.TemperatureLog).filter(models.TemperatureLog.batch_id == batch_id)
    
    if hours:
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        query = query.filter(models.TemperatureLog.timestamp >= cutoff)
    
    logs = query.order_by(models.TemperatureLog.timestamp.desc()).limit(limit).all()
    return list(reversed(logs))  # Return in chronological order


@router.delete("/{batch_id}")
def delete_batch(
    batch_id: int,
    db: Session = Depends(get_db)
):
    """Delete a batch."""
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    if batch.status == "active":
        raise HTTPException(status_code=400, detail="Cannot delete active batch. Stop it first.")
    
    db.delete(batch)
    db.commit()
    return {"message": "Batch deleted successfully"}


@router.post("/{batch_id}/clone", response_model=schemas.Batch)
def clone_batch(
    batch_id: int,
    fermenter_id: int,
    db: Session = Depends(get_db)
):
    """Clone an existing batch to a new fermenter."""
    original = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    # Verify fermenter is available
    fermenter = db.query(models.Fermenter).filter(models.Fermenter.id == fermenter_id).first()
    if not fermenter:
        raise HTTPException(status_code=404, detail="Fermenter not found")
    
    active_batch = db.query(models.Batch).filter(
        models.Batch.fermenter_id == fermenter_id,
        models.Batch.status.in_(["active", "scheduled"])
    ).first()
    
    if active_batch:
        raise HTTPException(status_code=400, detail="Fermenter already in use")
    
    # Create cloned batch
    batch_number = generate_batch_number(db)
    cloned = models.Batch(
        batch_number=batch_number,
        name=f"{original.name} (Clone)",
        notes=original.notes,
        profile_id=original.profile_id,
        fermenter_id=fermenter_id,
        status="scheduled",
        cost_ingredients=original.cost_ingredients,
        created_by_user_id=current_user.id
    )
    
    db.add(cloned)
    db.commit()
    db.refresh(cloned)
    
    return cloned


from datetime import timedelta


