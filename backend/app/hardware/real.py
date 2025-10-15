import os
import glob
from typing import Optional
from .base import SensorInterface, RelayInterface

try:
    import RPi.GPIO as GPIO
    GPIO_AVAILABLE = True
except ImportError:
    GPIO_AVAILABLE = False


class RealSensorInterface(SensorInterface):
    """Real DS18B20 1-wire sensor interface for Raspberry Pi."""
    
    def __init__(self):
        self.base_dir = '/sys/bus/w1/devices/'
        # Load kernel modules if not already loaded
        if os.path.exists(self.base_dir):
            os.system('modprobe w1-gpio')
            os.system('modprobe w1-therm')
    
    def _read_temp_raw(self, sensor_id: str) -> list[str]:
        """Read raw temperature data from sensor file."""
        device_file = os.path.join(self.base_dir, sensor_id, 'w1_slave')
        if not os.path.exists(device_file):
            return []
        
        try:
            with open(device_file, 'r') as f:
                lines = f.readlines()
            return lines
        except Exception as e:
            print(f"Error reading sensor {sensor_id}: {e}")
            return []
    
    def read_temperature(self, sensor_id: str) -> Optional[float]:
        """Read temperature from DS18B20 sensor."""
        lines = self._read_temp_raw(sensor_id)
        
        # Check if we got valid data
        if not lines or len(lines) < 2:
            return None
        
        # Check for successful read (YES at end of first line)
        if lines[0].strip()[-3:] != 'YES':
            return None
        
        # Extract temperature from second line
        equals_pos = lines[1].find('t=')
        if equals_pos == -1:
            return None
        
        temp_string = lines[1][equals_pos+2:]
        temp_c = float(temp_string) / 1000.0
        return round(temp_c, 2)
    
    def get_all_sensors(self) -> list[str]:
        """Get list of all connected DS18B20 sensors."""
        if not os.path.exists(self.base_dir):
            return []
        
        # Find all directories that start with '28-' (DS18B20 family code)
        sensor_folders = glob.glob(os.path.join(self.base_dir, '28-*'))
        return [os.path.basename(folder) for folder in sensor_folders]


class RealRelayInterface(RelayInterface):
    """Real GPIO relay interface for Raspberry Pi."""
    
    def __init__(self):
        if not GPIO_AVAILABLE:
            raise ImportError("RPi.GPIO not available. Install it or use mock mode.")
        
        # Set up GPIO mode
        GPIO.setmode(GPIO.BCM)
        GPIO.setwarnings(False)
        
        self.pins = {}
    
    def setup(self, gpio_pin: int):
        """Setup a GPIO pin as output."""
        GPIO.setup(gpio_pin, GPIO.OUT)
        GPIO.output(gpio_pin, GPIO.LOW)  # Start in off state
        self.pins[gpio_pin] = False
    
    def activate(self, gpio_pin: int):
        """Activate a relay (turn on)."""
        if gpio_pin not in self.pins:
            self.setup(gpio_pin)
        
        GPIO.output(gpio_pin, GPIO.HIGH)
        self.pins[gpio_pin] = True
    
    def deactivate(self, gpio_pin: int):
        """Deactivate a relay (turn off)."""
        if gpio_pin not in self.pins:
            self.setup(gpio_pin)
        
        GPIO.output(gpio_pin, GPIO.LOW)
        self.pins[gpio_pin] = False
    
    def get_state(self, gpio_pin: int) -> bool:
        """Get current state of a relay."""
        return self.pins.get(gpio_pin, False)
    
    def cleanup(self):
        """Clean up GPIO resources."""
        GPIO.cleanup()
        self.pins.clear()


