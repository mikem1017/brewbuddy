from abc import ABC, abstractmethod
from typing import Optional


class SensorInterface(ABC):
    """Abstract interface for temperature sensors."""
    
    @abstractmethod
    def read_temperature(self, sensor_id: str) -> Optional[float]:
        """Read temperature from a sensor. Returns None if sensor not found or error."""
        pass
    
    @abstractmethod
    def get_all_sensors(self) -> list[str]:
        """Get list of all available sensor IDs."""
        pass


class RelayInterface(ABC):
    """Abstract interface for relay control."""
    
    @abstractmethod
    def setup(self, gpio_pin: int):
        """Setup a GPIO pin as output."""
        pass
    
    @abstractmethod
    def activate(self, gpio_pin: int):
        """Activate a relay (turn on)."""
        pass
    
    @abstractmethod
    def deactivate(self, gpio_pin: int):
        """Deactivate a relay (turn off)."""
        pass
    
    @abstractmethod
    def get_state(self, gpio_pin: int) -> bool:
        """Get current state of a relay. True = on, False = off."""
        pass
    
    @abstractmethod
    def cleanup(self):
        """Clean up GPIO resources."""
        pass


