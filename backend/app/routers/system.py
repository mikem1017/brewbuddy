from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict
import os
import time
import psutil
from datetime import datetime
from .. import models, schemas, auth
from ..database import get_db
from ..hardware.manager import hardware_manager
from ..controllers.temperature_controller import temperature_controller

router = APIRouter(prefix="/api/system", tags=["system"])

# Track system start time
START_TIME = time.time()


@router.get("/health", response_model=schemas.SystemHealth)
def get_system_health(
    db: Session = Depends(get_db)
):
    """Get system health status."""
    # Calculate uptime
    uptime_seconds = time.time() - START_TIME
    
    # Get CPU temperature (Raspberry Pi specific)
    cpu_temp = None
    try:
        if os.path.exists('/sys/class/thermal/thermal_zone0/temp'):
            with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
                cpu_temp = float(f.read().strip()) / 1000.0
    except:
        pass
    
    # Get disk usage
    disk_usage = psutil.disk_usage('/')
    disk_usage_percent = disk_usage.percent
    
    # Get database size
    database_size_mb = 0
    if os.path.exists('brewbuddy.db'):
        database_size_mb = os.path.getsize('brewbuddy.db') / (1024 * 1024)
    
    # Count active batches
    active_batches = db.query(models.Batch).filter(models.Batch.status == "active").count()
    
    # Get sensor status
    sensor_status = {}
    all_sensors = hardware_manager.get_all_sensors()
    for sensor_id in all_sensors:
        temp = hardware_manager.read_temperature(sensor_id)
        sensor_status[sensor_id] = {
            "connected": temp is not None,
            "last_reading": datetime.utcnow().isoformat() if temp is not None else None,
            "temperature": temp
        }
    
    # Get relay status
    relay_status = {}
    fermenters = db.query(models.Fermenter).all()
    for fermenter in fermenters:
        relay_status[fermenter.heater_gpio] = {
            "fermenter": fermenter.name,
            "type": "heater",
            "cycles": fermenter.relay_cycle_count,
            "current_state": hardware_manager.get_relay_state(fermenter.heater_gpio)
        }
        relay_status[fermenter.chiller_gpio] = {
            "fermenter": fermenter.name,
            "type": "chiller",
            "cycles": fermenter.relay_cycle_count,
            "current_state": hardware_manager.get_relay_state(fermenter.chiller_gpio)
        }
    
    return schemas.SystemHealth(
        uptime_seconds=uptime_seconds,
        cpu_temp=cpu_temp,
        disk_usage_percent=disk_usage_percent,
        database_size_mb=database_size_mb,
        active_batches=active_batches,
        sensor_status=sensor_status,
        relay_status=relay_status
    )


@router.post("/manual-control/{fermenter_id}/heater/{state}")
def manual_control_heater(
    fermenter_id: int,
    state: bool,
    db: Session = Depends(get_db)
):
    """Manual control of heater relay (admin only)."""
    fermenter = db.query(models.Fermenter).filter(models.Fermenter.id == fermenter_id).first()
    if not fermenter:
        raise HTTPException(status_code=404, detail="Fermenter not found")
    
    # Check if fermenter has active batch
    active_batch = db.query(models.Batch).filter(
        models.Batch.fermenter_id == fermenter_id,
        models.Batch.status == "active"
    ).first()
    
    if active_batch:
        raise HTTPException(
            status_code=400,
            detail="Cannot manual control fermenter with active batch"
        )
    
    if state:
        hardware_manager.activate_relay(fermenter.heater_gpio)
    else:
        hardware_manager.deactivate_relay(fermenter.heater_gpio)
    return {"message": f"Heater {'activated' if state else 'deactivated'}"}


@router.post("/manual-control/{fermenter_id}/chiller/{state}")
def manual_control_chiller(
    fermenter_id: int,
    state: bool,
    db: Session = Depends(get_db)
):
    """Manual control of chiller relay (admin only)."""
    fermenter = db.query(models.Fermenter).filter(models.Fermenter.id == fermenter_id).first()
    if not fermenter:
        raise HTTPException(status_code=404, detail="Fermenter not found")
    
    # Check if fermenter has active batch
    active_batch = db.query(models.Batch).filter(
        models.Batch.fermenter_id == fermenter_id,
        models.Batch.status == "active"
    ).first()
    
    if active_batch:
        raise HTTPException(
            status_code=400,
            detail="Cannot manual control fermenter with active batch"
        )
    
    if state:
        hardware_manager.activate_relay(fermenter.chiller_gpio)
    else:
        hardware_manager.deactivate_relay(fermenter.chiller_gpio)
    return {"message": f"Chiller {'activated' if state else 'deactivated'}"}


@router.get("/sensors")
def list_sensors(
    current_user: models.User = Depends(auth.get_current_user)
):
    """List all available temperature sensors."""
    sensors = hardware_manager.get_all_sensors()
    sensor_data = []
    
    for sensor_id in sensors:
        temp = hardware_manager.read_temperature(sensor_id)
        sensor_data.append({
            "id": sensor_id,
            "temperature": temp,
            "connected": temp is not None
        })
    
    return sensor_data


