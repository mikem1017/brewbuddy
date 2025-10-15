from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/profiles", tags=["profiles"])


@router.get("/", response_model=List[schemas.BeerProfile])
def list_profiles(
    db: Session = Depends(get_db)
):
    """Get all beer profiles."""
    return db.query(models.BeerProfile).all()


@router.get("/{profile_id}", response_model=schemas.BeerProfile)
def get_profile(
    profile_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific beer profile."""
    profile = db.query(models.BeerProfile).filter(models.BeerProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.post("/", response_model=schemas.BeerProfile)
def create_profile(
    profile: schemas.BeerProfileCreate,
    db: Session = Depends(get_db)
):
    """Create a new beer profile with phases."""
    db_profile = models.BeerProfile(
        name=profile.name,
        description=profile.description,
        beer_type=profile.beer_type,
        source="local"
    )
    db.add(db_profile)
    db.flush()  # Get the ID without committing
    
    # Add phases
    for phase_data in profile.phases:
        phase = models.ProfilePhase(
            profile_id=db_profile.id,
            **phase_data.model_dump()
        )
        db.add(phase)
    
    db.commit()
    db.refresh(db_profile)
    
    return db_profile


@router.put("/{profile_id}", response_model=schemas.BeerProfile)
def update_profile(
    profile_id: int,
    profile_update: schemas.BeerProfileUpdate,
    db: Session = Depends(get_db)
):
    """Update a beer profile."""
    db_profile = db.query(models.BeerProfile).filter(models.BeerProfile.id == profile_id).first()
    if not db_profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    update_data = profile_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_profile, field, value)
    
    db.commit()
    db.refresh(db_profile)
    
    return db_profile


@router.delete("/{profile_id}")
def delete_profile(
    profile_id: int,
    db: Session = Depends(get_db)
):
    """Delete a beer profile."""
    db_profile = db.query(models.BeerProfile).filter(models.BeerProfile.id == profile_id).first()
    if not db_profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Check if profile is in use
    active_batch = db.query(models.Batch).filter(
        models.Batch.profile_id == profile_id,
        models.Batch.status.in_(["active", "scheduled"])
    ).first()
    
    if active_batch:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete profile with active or scheduled batches"
        )
    
    db.delete(db_profile)
    db.commit()
    
    return {"message": "Profile deleted successfully"}


@router.post("/{profile_id}/phases", response_model=schemas.ProfilePhase)
def add_phase(
    profile_id: int,
    phase: schemas.ProfilePhaseCreate,
    db: Session = Depends(get_db)
):
    """Add a phase to a profile."""
    profile = db.query(models.BeerProfile).filter(models.BeerProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    db_phase = models.ProfilePhase(profile_id=profile_id, **phase.model_dump())
    db.add(db_phase)
    db.commit()
    db.refresh(db_phase)
    
    return db_phase


@router.delete("/{profile_id}/phases/{phase_id}")
def delete_phase(
    profile_id: int,
    phase_id: int,
    db: Session = Depends(get_db)
):
    """Delete a phase from a profile."""
    phase = db.query(models.ProfilePhase).filter(
        models.ProfilePhase.id == phase_id,
        models.ProfilePhase.profile_id == profile_id
    ).first()
    
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    
    db.delete(phase)
    db.commit()
    
    return {"message": "Phase deleted successfully"}

