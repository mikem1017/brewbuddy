import time
import threading
from datetime import datetime, timedelta
from typing import Dict, Optional
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import Batch, Fermenter, TemperatureLog, ProfilePhase
from ..hardware.manager import hardware_manager
from ..config import settings


class TemperatureController:
    """Controls temperature for all active batches."""
    
    def __init__(self):
        self.running = False
        self.thread: Optional[threading.Thread] = None
        self.active_batches: Dict[int, dict] = {}  # batch_id -> control state
        self.lock = threading.Lock()
        self.last_sensor_reading = {}  # sensor_id -> timestamp
        
    def start(self):
        """Start the temperature control loop."""
        if self.running:
            print("Temperature controller already running")
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._control_loop, daemon=True)
        self.thread.start()
        print("Temperature controller started")
    
    def stop(self):
        """Stop the temperature control loop."""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        
        # Turn off all relays
        with self.lock:
            for batch_id, state in self.active_batches.items():
                self._deactivate_all(state['heater_gpio'], state['chiller_gpio'])
        
        hardware_manager.cleanup()
        print("Temperature controller stopped")
    
    def _control_loop(self):
        """Main control loop that runs continuously."""
        while self.running:
            try:
                db = SessionLocal()
                try:
                    self._update_active_batches(db)
                    self._process_batches(db)
                finally:
                    db.close()
            except Exception as e:
                print(f"Error in control loop: {e}")
            
            # Sleep for configured interval
            time.sleep(settings.control_loop_interval)
    
    def _update_active_batches(self, db: Session):
        """Update the list of active batches."""
        active = db.query(Batch).filter(Batch.status == "active").all()
        
        with self.lock:
            current_ids = set(self.active_batches.keys())
            new_ids = set(batch.id for batch in active)
            
            # Remove stopped batches
            for batch_id in current_ids - new_ids:
                state = self.active_batches[batch_id]
                self._deactivate_all(state['heater_gpio'], state['chiller_gpio'])
                del self.active_batches[batch_id]
            
            # Add new batches
            for batch in active:
                if batch.id not in self.active_batches:
                    fermenter = db.query(Fermenter).filter(Fermenter.id == batch.fermenter_id).first()
                    if fermenter:
                        self.active_batches[batch.id] = {
                            'batch': batch,
                            'fermenter': fermenter,
                            'sensor_id': fermenter.sensor_id,
                            'heater_gpio': fermenter.heater_gpio,
                            'chiller_gpio': fermenter.chiller_gpio,
                        }
    
    def _process_batches(self, db: Session):
        """Process all active batches."""
        with self.lock:
            for batch_id, state in self.active_batches.items():
                try:
                    self._process_batch(db, batch_id, state)
                except Exception as e:
                    print(f"Error processing batch {batch_id}: {e}")
    
    def _process_batch(self, db: Session, batch_id: int, state: dict):
        """Process a single batch."""
        # Read current temperature
        sensor_id = state['sensor_id']
        actual_temp = hardware_manager.read_temperature(sensor_id)
        
        if actual_temp is None:
            # Sensor timeout - turn off relays for safety
            if self._check_sensor_timeout(sensor_id):
                print(f"Sensor timeout for batch {batch_id}, deactivating relays")
                self._deactivate_all(state['heater_gpio'], state['chiller_gpio'])
            return
        
        # Update last reading time
        self.last_sensor_reading[sensor_id] = datetime.utcnow()
        
        # Get target temperature for current phase
        target_temp = self._get_target_temperature(db, state['batch'])
        
        if target_temp is None:
            # No target temperature, turn off
            self._deactivate_all(state['heater_gpio'], state['chiller_gpio'])
            control_state = "idle"
        else:
            # Apply hysteresis control
            control_state = self._apply_control(
                actual_temp,
                target_temp,
                state['heater_gpio'],
                state['chiller_gpio'],
                state['fermenter']
            )
        
        # Log temperature
        self._log_temperature(
            db,
            batch_id,
            actual_temp,
            target_temp or actual_temp,
            control_state
        )
        
        # Simulate temperature change for mock mode
        if settings.hardware_mode == "mock" and hasattr(hardware_manager.sensor_interface, 'simulate_heating'):
            heating = hardware_manager.get_relay_state(state['heater_gpio'])
            cooling = hardware_manager.get_relay_state(state['chiller_gpio'])
            hardware_manager.sensor_interface.simulate_heating(sensor_id, heating, cooling)
    
    def _get_target_temperature(self, db: Session, batch: Batch) -> Optional[float]:
        """Get target temperature for current phase."""
        if not batch.start_time:
            return None
        
        elapsed = datetime.utcnow() - batch.start_time
        elapsed_hours = elapsed.total_seconds() / 3600
        
        # Get all phases for this batch's profile
        phases = db.query(ProfilePhase).filter(
            ProfilePhase.profile_id == batch.profile_id
        ).order_by(ProfilePhase.sequence_order).all()
        
        if not phases:
            return None
        
        # Find current phase
        cumulative_hours = 0
        for phase in phases:
            cumulative_hours += phase.duration_hours
            if elapsed_hours <= cumulative_hours:
                return phase.target_temp_celsius
        
        # Past all phases, use last phase temperature
        return phases[-1].target_temp_celsius
    
    def _apply_control(
        self,
        actual_temp: float,
        target_temp: float,
        heater_gpio: int,
        chiller_gpio: int,
        fermenter: Fermenter
    ) -> str:
        """Apply hysteresis control algorithm."""
        hysteresis = settings.hysteresis_temp
        
        if actual_temp < target_temp - hysteresis:
            # Too cold, activate heater
            hardware_manager.activate_relay(heater_gpio)
            hardware_manager.deactivate_relay(chiller_gpio)
            self._increment_relay_cycle(fermenter, heater_gpio)
            return "heating"
        
        elif actual_temp > target_temp + hysteresis:
            # Too hot, activate chiller
            hardware_manager.deactivate_relay(heater_gpio)
            hardware_manager.activate_relay(chiller_gpio)
            self._increment_relay_cycle(fermenter, chiller_gpio)
            return "cooling"
        
        else:
            # Within deadband, turn off both
            hardware_manager.deactivate_relay(heater_gpio)
            hardware_manager.deactivate_relay(chiller_gpio)
            return "idle"
    
    def _deactivate_all(self, heater_gpio: int, chiller_gpio: int):
        """Deactivate both heater and chiller."""
        hardware_manager.deactivate_relay(heater_gpio)
        hardware_manager.deactivate_relay(chiller_gpio)
    
    def _check_sensor_timeout(self, sensor_id: str) -> bool:
        """Check if sensor has timed out."""
        if sensor_id not in self.last_sensor_reading:
            return False
        
        last_reading = self.last_sensor_reading[sensor_id]
        timeout = timedelta(seconds=settings.sensor_timeout)
        return datetime.utcnow() - last_reading > timeout
    
    def _increment_relay_cycle(self, fermenter: Fermenter, gpio_pin: int):
        """Increment relay cycle count (do it sparingly to avoid DB overhead)."""
        # Only increment every 100th activation to reduce DB writes
        if fermenter.relay_cycle_count % 100 == 0:
            fermenter.relay_cycle_count += 1
    
    def _log_temperature(
        self,
        db: Session,
        batch_id: int,
        actual_temp: float,
        target_temp: float,
        control_state: str
    ):
        """Log temperature reading to database."""
        log = TemperatureLog(
            batch_id=batch_id,
            actual_temp=actual_temp,
            target_temp=target_temp,
            control_state=control_state,
            power_consumed_wh=0  # TODO: Calculate based on relay state and time
        )
        db.add(log)
        db.commit()


# Global controller instance
temperature_controller = TemperatureController()


