from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import json
import asyncio
from .. import models, schemas, auth
from ..database import get_db, SessionLocal
from ..controllers.temperature_controller import temperature_controller

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def calculate_current_phase(batch: models.Batch, db: Session) -> tuple:
    """Calculate current phase and progress."""
    if not batch.start_time:
        return None, 0
    
    elapsed = datetime.utcnow() - batch.start_time
    elapsed_hours = elapsed.total_seconds() / 3600
    
    phases = db.query(models.ProfilePhase).filter(
        models.ProfilePhase.profile_id == batch.profile_id
    ).order_by(models.ProfilePhase.sequence_order).all()
    
    cumulative_hours = 0
    for i, phase in enumerate(phases):
        phase_end = cumulative_hours + phase.duration_hours
        if elapsed_hours <= phase_end:
            phase_progress = ((elapsed_hours - cumulative_hours) / phase.duration_hours) * 100
            return i, min(100, max(0, phase_progress))
        cumulative_hours = phase_end
    
    # Past all phases
    return len(phases) - 1, 100


@router.get("/", response_model=List[schemas.DashboardBatchStatus])
def get_dashboard(
    db: Session = Depends(get_db)
):
    """Get dashboard status for all active batches."""
    active_batches = db.query(models.Batch).filter(
        models.Batch.status == "active"
    ).all()
    
    result = []
    for batch in active_batches:
        # Get most recent temperature log
        recent_log = db.query(models.TemperatureLog).filter(
            models.TemperatureLog.batch_id == batch.id
        ).order_by(models.TemperatureLog.timestamp.desc()).first()
        
        # Get recent logs for chart (last hour)
        cutoff = datetime.utcnow() - timedelta(hours=1)
        recent_logs = db.query(models.TemperatureLog).filter(
            models.TemperatureLog.batch_id == batch.id,
            models.TemperatureLog.timestamp >= cutoff
        ).order_by(models.TemperatureLog.timestamp.asc()).all()
        
        # Calculate current phase
        current_phase, phase_progress = calculate_current_phase(batch, db)
        
        # Calculate elapsed time
        elapsed_hours = None
        if batch.start_time:
            elapsed = datetime.utcnow() - batch.start_time
            elapsed_hours = elapsed.total_seconds() / 3600
        
        status = schemas.DashboardBatchStatus(
            batch=batch,
            current_temp=recent_log.actual_temp if recent_log else None,
            target_temp=recent_log.target_temp if recent_log else None,
            control_state=recent_log.control_state if recent_log else None,
            current_phase=current_phase,
            phase_progress=phase_progress,
            elapsed_hours=elapsed_hours,
            recent_logs=recent_logs
        )
        result.append(status)
    
    return result


# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass


manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time dashboard updates."""
    await manager.connect(websocket)
    
    try:
        while True:
            # Send updates every 5 seconds
            db = SessionLocal()
            try:
                # Get dashboard data
                active_batches = db.query(models.Batch).filter(
                    models.Batch.status == "active"
                ).all()
                
                updates = []
                for batch in active_batches:
                    recent_log = db.query(models.TemperatureLog).filter(
                        models.TemperatureLog.batch_id == batch.id
                    ).order_by(models.TemperatureLog.timestamp.desc()).first()
                    
                    current_phase, phase_progress = calculate_current_phase(batch, db)
                    
                    elapsed_hours = None
                    if batch.start_time:
                        elapsed = datetime.utcnow() - batch.start_time
                        elapsed_hours = elapsed.total_seconds() / 3600
                    
                    updates.append({
                        "batch_id": batch.id,
                        "batch_number": batch.batch_number,
                        "current_temp": recent_log.actual_temp if recent_log else None,
                        "target_temp": recent_log.target_temp if recent_log else None,
                        "control_state": recent_log.control_state if recent_log else None,
                        "current_phase": current_phase,
                        "phase_progress": phase_progress,
                        "elapsed_hours": elapsed_hours,
                        "timestamp": datetime.utcnow().isoformat()
                    })
                
                await websocket.send_json({"type": "update", "data": updates})
            finally:
                db.close()
            
            await asyncio.sleep(5)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

