from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("/rules", response_model=List[schemas.AlertRule])
def list_alert_rules(
    db: Session = Depends(get_db)
):
    """Get all alert rules."""
    return db.query(models.AlertRule).all()


@router.post("/rules", response_model=schemas.AlertRule)
def create_alert_rule(
    rule: schemas.AlertRuleCreate,
    db: Session = Depends(get_db)
):
    """Create a new alert rule."""
    # Verify fermenter exists
    fermenter = db.query(models.Fermenter).filter(models.Fermenter.id == rule.fermenter_id).first()
    if not fermenter:
        raise HTTPException(status_code=404, detail="Fermenter not found")
    
    db_rule = models.AlertRule(**rule.model_dump())
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    
    return db_rule


@router.put("/rules/{rule_id}", response_model=schemas.AlertRule)
def update_alert_rule(
    rule_id: int,
    rule_update: schemas.AlertRuleUpdate,
    db: Session = Depends(get_db)
):
    """Update an alert rule."""
    db_rule = db.query(models.AlertRule).filter(models.AlertRule.id == rule_id).first()
    if not db_rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    
    update_data = rule_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_rule, field, value)
    
    db.commit()
    db.refresh(db_rule)
    
    return db_rule


@router.delete("/rules/{rule_id}")
def delete_alert_rule(
    rule_id: int,
    db: Session = Depends(get_db)
):
    """Delete an alert rule."""
    db_rule = db.query(models.AlertRule).filter(models.AlertRule.id == rule_id).first()
    if not db_rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    
    db.delete(db_rule)
    db.commit()
    
    return {"message": "Alert rule deleted successfully"}


@router.get("/history", response_model=List[schemas.AlertHistory])
def list_alert_history(
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get alert history."""
    return db.query(models.AlertHistory).order_by(
        models.AlertHistory.triggered_at.desc()
    ).limit(limit).all()


@router.post("/history/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: int,
    db: Session = Depends(get_db)
):
    """Acknowledge an alert."""
    alert = db.query(models.AlertHistory).filter(models.AlertHistory.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.acknowledged = True
    db.commit()
    
    return {"message": "Alert acknowledged"}


