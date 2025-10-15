from typing import Optional
from ..config import settings
from .base import SensorInterface, RelayInterface
from .mock import MockSensorInterface, MockRelayInterface
from .real import RealSensorInterface, RealRelayInterface


class HardwareManager:
    """Manages hardware interfaces with automatic mock/real selection."""
    
    def __init__(self):
        self.sensor_interface: SensorInterface
        self.relay_interface: RelayInterface
        
        if settings.hardware_mode == "mock":
            print("Initializing MOCK hardware interfaces")
            mock_sensor = MockSensorInterface()
            self.sensor_interface = mock_sensor
            self.relay_interface = MockRelayInterface(mock_sensor)
        else:
            print("Initializing REAL hardware interfaces")
            self.sensor_interface = RealSensorInterface()
            self.relay_interface = RealRelayInterface()
        
        # Track which relays are set up
        self.setup_pins = set()
    
    def ensure_pin_setup(self, gpio_pin: int):
        """Ensure a GPIO pin is set up before use."""
        if gpio_pin not in self.setup_pins:
            self.relay_interface.setup(gpio_pin)
            self.setup_pins.add(gpio_pin)
    
    def read_temperature(self, sensor_id: str) -> Optional[float]:
        """Read temperature from a sensor."""
        return self.sensor_interface.read_temperature(sensor_id)
    
    def get_all_sensors(self) -> list[str]:
        """Get list of all available sensors."""
        return self.sensor_interface.get_all_sensors()
    
    def activate_relay(self, gpio_pin: int):
        """Activate a relay."""
        self.ensure_pin_setup(gpio_pin)
        self.relay_interface.activate(gpio_pin)
    
    def deactivate_relay(self, gpio_pin: int):
        """Deactivate a relay."""
        self.ensure_pin_setup(gpio_pin)
        self.relay_interface.deactivate(gpio_pin)
    
    def get_relay_state(self, gpio_pin: int) -> bool:
        """Get current state of a relay."""
        return self.relay_interface.get_state(gpio_pin)
    
    def cleanup(self):
        """Clean up hardware resources."""
        self.relay_interface.cleanup()


# Global hardware manager instance
hardware_manager = HardwareManager()


