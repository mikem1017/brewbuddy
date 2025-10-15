from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from .. import models, schemas, auth
from ..database import get_db
import json

router = APIRouter(prefix="/api/settings", tags=["settings"])


DEFAULT_SETTINGS = {
    "units_temperature": "celsius",  # celsius, fahrenheit
    "units_volume": "liters",  # liters, gallons
    "theme": "dark",  # light, dark, high-contrast, brew-master
    "graph_time_range": "auto",  # auto, 1h, 6h, 24h, 7d, full
    "live_plotting": "true",
    "show_tooltips": "true",
    "email_notifications": "false",
    "email_temp_high": "true",
    "email_temp_low": "true",
    "email_phase_complete": "true",
    "email_daily_summary": "false",
    "email_weekly_summary": "false",
}


def get_setting_value(db: Session, key: str) -> str:
    """Get a setting value, returning default if not found."""
    setting = db.query(models.Settings).filter(models.Settings.key == key).first()
    if setting:
        return setting.value
    return DEFAULT_SETTINGS.get(key, "")


@router.get("/", response_model=Dict[str, str])
def get_all_settings(
    db: Session = Depends(get_db)
):
    """Get all settings."""
    settings_dict = DEFAULT_SETTINGS.copy()
    
    db_settings = db.query(models.Settings).all()
    for setting in db_settings:
        settings_dict[setting.key] = setting.value
    
    return settings_dict


@router.get("/{key}")
def get_setting(
    key: str,
    db: Session = Depends(get_db)
):
    """Get a specific setting."""
    value = get_setting_value(db, key)
    return {"key": key, "value": value}


@router.put("/{key}")
def update_setting(
    key: str,
    value: str,
    db: Session = Depends(get_db)
):
    """Update a setting."""
    setting = db.query(models.Settings).filter(models.Settings.key == key).first()
    
    if setting:
        setting.value = value
    else:
        setting = models.Settings(key=key, value=value)
        db.add(setting)
    
    db.commit()
    db.refresh(setting)
    return {"key": key, "value": value}


@router.post("/bulk")
def update_multiple_settings(
    settings: Dict[str, str],
    db: Session = Depends(get_db)
):
    """Update multiple settings at once."""
    for key, value in settings.items():
        setting = db.query(models.Settings).filter(models.Settings.key == key).first()
        if setting:
            setting.value = value
        else:
            setting = models.Settings(key=key, value=value)
            db.add(setting)
    
    db.commit()
    return {"message": "Settings updated successfully", "updated": len(settings)}


