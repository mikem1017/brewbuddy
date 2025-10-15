from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/fermenters", tags=["fermenters"])


@router.get("/", response_model=List[schemas.Fermenter])
def list_fermenters(
    db: Session = Depends(get_db)
):
    """Get all fermenters."""
    return db.query(models.Fermenter).all()


@router.get("/{fermenter_id}", response_model=schemas.Fermenter)
def get_fermenter(
    fermenter_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific fermenter."""
    fermenter = db.query(models.Fermenter).filter(models.Fermenter.id == fermenter_id).first()
    if not fermenter:
        raise HTTPException(status_code=404, detail="Fermenter not found")
    return fermenter


@router.post("/", response_model=schemas.Fermenter)
def create_fermenter(
    fermenter: schemas.FermenterCreate,
    db: Session = Depends(get_db)
):
    """Create a new fermenter (max 4)."""
    # Check limit
    count = db.query(models.Fermenter).count()
    if count >= 4:
        raise HTTPException(
            status_code=400,
            detail="Maximum of 4 fermenters allowed. Delete one to add another."
        )
    
    # Check for duplicate GPIO pins
    existing = db.query(models.Fermenter).filter(
        (models.Fermenter.heater_gpio == fermenter.heater_gpio) |
        (models.Fermenter.chiller_gpio == fermenter.chiller_gpio) |
        (models.Fermenter.heater_gpio == fermenter.chiller_gpio) |
        (models.Fermenter.chiller_gpio == fermenter.heater_gpio)
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="GPIO pin already in use")
    
    db_fermenter = models.Fermenter(**fermenter.model_dump(), status="clean")
    db.add(db_fermenter)
    db.commit()
    db.refresh(db_fermenter)
    
    return db_fermenter


@router.put("/{fermenter_id}", response_model=schemas.Fermenter)
def update_fermenter(
    fermenter_id: int,
    fermenter_update: schemas.FermenterUpdate,
    db: Session = Depends(get_db)
):
    """Update a fermenter."""
    db_fermenter = db.query(models.Fermenter).filter(models.Fermenter.id == fermenter_id).first()
    if not db_fermenter:
        raise HTTPException(status_code=404, detail="Fermenter not found")
    
    # Check if fermenter is in use
    active_batch = db.query(models.Batch).filter(
        models.Batch.fermenter_id == fermenter_id,
        models.Batch.status == "active"
    ).first()
    
    if active_batch:
        raise HTTPException(
            status_code=400,
            detail="Cannot modify fermenter while batch is active"
        )
    
    # Update fields
    update_data = fermenter_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_fermenter, field, value)
    
    db.commit()
    db.refresh(db_fermenter)
    
    return db_fermenter


@router.delete("/{fermenter_id}")
def delete_fermenter(
    fermenter_id: int,
    db: Session = Depends(get_db)
):
    """Delete a fermenter."""
    db_fermenter = db.query(models.Fermenter).filter(models.Fermenter.id == fermenter_id).first()
    if not db_fermenter:
        raise HTTPException(status_code=404, detail="Fermenter not found")
    
    # Check if fermenter is in use
    active_batch = db.query(models.Batch).filter(
        models.Batch.fermenter_id == fermenter_id,
        models.Batch.status.in_(["active", "scheduled"])
    ).first()
    
    if active_batch:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete fermenter with active or scheduled batches"
        )
    
    db.delete(db_fermenter)
    db.commit()
    
    return {"message": "Fermenter deleted successfully"}

