from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import json
import csv
import io
from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api", tags=["extras"])


# Gravity Readings
@router.post("/batches/{batch_id}/gravity", response_model=schemas.GravityReading)
def add_gravity_reading(
    batch_id: int,
    reading: schemas.GravityReadingCreate,
    db: Session = Depends(get_db)
):
    """Add a gravity reading to a batch."""
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    db_reading = models.GravityReading(**reading.model_dump())
    db.add(db_reading)
    db.commit()
    db.refresh(db_reading)
    
    return db_reading


@router.get("/batches/{batch_id}/gravity", response_model=List[schemas.GravityReading])
def list_gravity_readings(
    batch_id: int,
    db: Session = Depends(get_db)
):
    """Get all gravity readings for a batch."""
    return db.query(models.GravityReading).filter(
        models.GravityReading.batch_id == batch_id
    ).order_by(models.GravityReading.timestamp.asc()).all()


# Batch Journal
@router.post("/batches/{batch_id}/journal", response_model=schemas.BatchJournal)
def add_journal_entry(
    batch_id: int,
    entry: schemas.BatchJournalCreate,
    db: Session = Depends(get_db)
):
    """Add a journal entry to a batch."""
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    db_entry = models.BatchJournal(
        **entry.model_dump(),
        created_by_user_id=current_user.id
    )
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    
    return db_entry


@router.get("/batches/{batch_id}/journal", response_model=List[schemas.BatchJournal])
def list_journal_entries(
    batch_id: int,
    db: Session = Depends(get_db)
):
    """Get all journal entries for a batch."""
    return db.query(models.BatchJournal).filter(
        models.BatchJournal.batch_id == batch_id
    ).order_by(models.BatchJournal.timestamp.asc()).all()


# Brew Session
@router.post("/batches/{batch_id}/brew-session", response_model=schemas.BrewSession)
def create_brew_session(
    batch_id: int,
    session: schemas.BrewSessionCreate,
    db: Session = Depends(get_db)
):
    """Create or update brew session for a batch."""
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    # Check if session already exists
    existing = db.query(models.BrewSession).filter(
        models.BrewSession.batch_id == batch_id
    ).first()
    
    if existing:
        # Update existing
        update_data = session.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return existing
    else:
        # Create new
        db_session = models.BrewSession(**session.model_dump())
        db.add(db_session)
        db.commit()
        db.refresh(db_session)
        return db_session


@router.get("/batches/{batch_id}/brew-session", response_model=schemas.BrewSession)
def get_brew_session(
    batch_id: int,
    db: Session = Depends(get_db)
):
    """Get brew session for a batch."""
    session = db.query(models.BrewSession).filter(
        models.BrewSession.batch_id == batch_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Brew session not found")
    return session


# Maintenance
@router.post("/fermenters/{fermenter_id}/maintenance", response_model=schemas.MaintenanceSchedule)
def create_maintenance_schedule(
    fermenter_id: int,
    schedule: schemas.MaintenanceScheduleCreate,
    db: Session = Depends(get_db)
):
    """Create a maintenance schedule for a fermenter."""
    fermenter = db.query(models.Fermenter).filter(models.Fermenter.id == fermenter_id).first()
    if not fermenter:
        raise HTTPException(status_code=404, detail="Fermenter not found")
    
    db_schedule = models.MaintenanceSchedule(**schedule.model_dump())
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    
    return db_schedule


@router.get("/fermenters/{fermenter_id}/maintenance", response_model=List[schemas.MaintenanceSchedule])
def list_maintenance_schedules(
    fermenter_id: int,
    db: Session = Depends(get_db)
):
    """Get all maintenance schedules for a fermenter."""
    return db.query(models.MaintenanceSchedule).filter(
        models.MaintenanceSchedule.fermenter_id == fermenter_id
    ).all()


# Export
@router.get("/export/batch/{batch_id}/csv")
def export_batch_csv(
    batch_id: int,
    db: Session = Depends(get_db)
):
    """Export batch temperature logs as CSV."""
    from fastapi.responses import StreamingResponse
    
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    logs = db.query(models.TemperatureLog).filter(
        models.TemperatureLog.batch_id == batch_id
    ).order_by(models.TemperatureLog.timestamp.asc()).all()
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Timestamp', 'Actual Temp', 'Target Temp', 'Control State', 'Power (Wh)'])
    
    for log in logs:
        writer.writerow([
            log.timestamp.isoformat(),
            log.actual_temp,
            log.target_temp,
            log.control_state,
            log.power_consumed_wh
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=batch_{batch.batch_number}_logs.csv"}
    )


# Webhooks
@router.get("/webhooks", response_model=List[schemas.Webhook])
def list_webhooks(
    db: Session = Depends(get_db)
):
    """Get all webhooks."""
    return db.query(models.Webhook).all()


@router.post("/webhooks", response_model=schemas.Webhook)
def create_webhook(
    webhook: schemas.WebhookCreate,
    db: Session = Depends(get_db)
):
    """Create a new webhook."""
    db_webhook = models.Webhook(**webhook.model_dump())
    db.add(db_webhook)
    db.commit()
    db.refresh(db_webhook)
    
    return db_webhook


@router.delete("/webhooks/{webhook_id}")
def delete_webhook(
    webhook_id: int,
    db: Session = Depends(get_db)
):
    """Delete a webhook."""
    webhook = db.query(models.Webhook).filter(models.Webhook.id == webhook_id).first()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    db.delete(webhook)
    db.commit()
    
    return {"message": "Webhook deleted successfully"}


