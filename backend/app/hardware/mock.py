import random
import time
from typing import Optional
from .base import SensorInterface, RelayInterface


class MockSensorInterface(SensorInterface):
    """Mock sensor interface for development/testing."""
    
    def __init__(self):
        self.sensors = {
            "28-00000001": 18.0,
            "28-00000002": 19.0,
            "28-00000003": 20.0,
            "28-00000004": 21.0,
        }
        # Track heating/cooling states for simulation
        self.heating_pins = set()
        self.cooling_pins = set()
        self.last_update = time.time()
    
    def set_relay_state(self, heating: bool, cooling: bool):
        """Called by relay interface to influence temperature simulation."""
        pass
    
    def read_temperature(self, sensor_id: str) -> Optional[float]:
        """Simulate temperature reading with realistic drift."""
        if sensor_id not in self.sensors:
            return None
        
        # Simulate temperature drift
        current_time = time.time()
        time_delta = current_time - self.last_update
        
        # Add small random variation
        variation = random.uniform(-0.1, 0.1) * time_delta
        self.sensors[sensor_id] += variation
        
        # Keep in reasonable range
        self.sensors[sensor_id] = max(0, min(40, self.sensors[sensor_id]))
        
        return round(self.sensors[sensor_id], 2)
    
    def get_all_sensors(self) -> list[str]:
        """Return list of mock sensor IDs."""
        return list(self.sensors.keys())
    
    def simulate_heating(self, sensor_id: str, heating: bool, cooling: bool):
        """Simulate temperature change based on heating/cooling."""
        if sensor_id not in self.sensors:
            return
        
        if heating:
            self.sensors[sensor_id] += 0.05  # Heat up slowly
        elif cooling:
            self.sensors[sensor_id] -= 0.05  # Cool down slowly
        else:
            # Drift toward ambient (20°C)
            ambient = 20.0
            if self.sensors[sensor_id] > ambient:
                self.sensors[sensor_id] -= 0.01
            elif self.sensors[sensor_id] < ambient:
                self.sensors[sensor_id] += 0.01


class MockRelayInterface(RelayInterface):
    """Mock relay interface for development/testing."""
    
    def __init__(self, sensor_interface: MockSensorInterface):
        self.pins = {}
        self.sensor_interface = sensor_interface
        self.pin_to_sensor = {}  # Map GPIO pins to sensor IDs for simulation
    
    def setup(self, gpio_pin: int):
        """Setup a mock GPIO pin."""
        self.pins[gpio_pin] = False
        print(f"[MOCK] GPIO pin {gpio_pin} setup as output")
    
    def activate(self, gpio_pin: int):
        """Activate a mock relay."""
        if gpio_pin not in self.pins:
            self.setup(gpio_pin)
        self.pins[gpio_pin] = True
        print(f"[MOCK] GPIO pin {gpio_pin} activated (ON)")
    
    def deactivate(self, gpio_pin: int):
        """Deactivate a mock relay."""
        if gpio_pin not in self.pins:
            self.setup(gpio_pin)
        self.pins[gpio_pin] = False
        print(f"[MOCK] GPIO pin {gpio_pin} deactivated (OFF)")
    
    def get_state(self, gpio_pin: int) -> bool:
        """Get current state of a mock relay."""
        return self.pins.get(gpio_pin, False)
    
    def cleanup(self):
        """Clean up mock GPIO resources."""
        self.pins.clear()
        print("[MOCK] GPIO cleanup complete")


