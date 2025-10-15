# BrewBuddy Hardware Guide

## Bill of Materials (BOM)

### Core Components

| Component | Quantity | Notes | Est. Cost |
|-----------|----------|-------|-----------|
| Raspberry Pi 4 (2GB+) | 1 | Recommended: 4GB model | $35-55 |
| MicroSD Card (32GB) | 1 | Class 10 or better | $10 |
| DS18B20 Temperature Sensor | 4 | Waterproof probe version | $3-5 each |
| 8-Channel Relay Module | 1 | 5V trigger, isolated | $8-15 |
| 4.7kΩ Resistor | 1 | Pull-up for 1-wire bus | $0.10 |
| Power Supply (5V, 3A) | 1 | For Raspberry Pi | $10 |
| 12V/24V Power Supply | 1 | For relays (match your equipment) | $15-30 |
| Project Enclosure | 1 | Weatherproof recommended | $10-20 |
| Terminal Blocks | 1 set | For connections | $5 |
| Jumper Wires | 1 set | Male-female | $5 |

**Total Estimated Cost: $150-200**

## Wiring Diagram

### Temperature Sensors (DS18B20)

```
DS18B20 Wiring:
┌─────────────┐
│  DS18B20    │
│  (Probe)    │
└─────────────┘
   │ │ │
   │ │ └─ DATA ──────────┐
   │ └─── VCC (3.3V) ─────┤ ┌──────────────┐
   └───── GND ───────────┤ │ Raspberry Pi │
                   4.7kΩ │ │              │
                    ├────┤ GPIO 4 (1-Wire)│
                    │    │ 3.3V           │
                    └────┤ GND            │
                         └──────────────┘

Multiple Sensors (Parallel):
All sensors connect to same GPIO 4, VCC, and GND
```

### GPIO Pin Configuration

**Default Pin Layout:**

| Function | GPIO Pin | Physical Pin | Notes |
|----------|----------|--------------|-------|
| 1-Wire Bus | GPIO 4 | Pin 7 | For all temp sensors |
| Fermenter 1 Heater | GPIO 17 | Pin 11 | |
| Fermenter 1 Chiller | GPIO 27 | Pin 13 | |
| Fermenter 2 Heater | GPIO 22 | Pin 15 | |
| Fermenter 2 Chiller | GPIO 23 | Pin 16 | |
| Fermenter 3 Heater | GPIO 24 | Pin 18 | |
| Fermenter 3 Chiller | GPIO 25 | Pin 22 | |
| Fermenter 4 Heater | GPIO 5 | Pin 29 | |
| Fermenter 4 Chiller | GPIO 6 | Pin 31 | |

### Relay Module Wiring

```
8-Channel Relay Module:
┌────────────────────────────────────┐
│  IN1  IN2  IN3  IN4  IN5  IN6  IN7  IN8  │  ← Connect to GPIO pins
│  VCC  GND                               │
└────────────────────────────────────┘
   │    │
   │    └─ GND
   └────── 5V

Raspberry Pi:
┌──────────────┐
│ GPIO 17 ──────┼─ IN1 (Fermenter 1 Heater)
│ GPIO 27 ──────┼─ IN2 (Fermenter 1 Chiller)
│ GPIO 22 ──────┼─ IN3 (Fermenter 2 Heater)
│ GPIO 23 ──────┼─ IN4 (Fermenter 2 Chiller)
│ GPIO 24 ──────┼─ IN5 (Fermenter 3 Heater)
│ GPIO 25 ──────┼─ IN6 (Fermenter 3 Chiller)
│ GPIO 5 ───────┼─ IN7 (Fermenter 4 Heater)
│ GPIO 6 ───────┼─ IN8 (Fermenter 4 Chiller)
│ 5V ───────────┼─ VCC
│ GND ──────────┼─ GND
└──────────────┘
```

### Relay to Equipment

```
Relay Output (Each Channel):
┌─────────────┐
│   RELAY     │
│  NO  COM  NC│
└──┬───┬───┬──┘
   │   │   │
   │   │   └─ Normally Closed (unused)
   │   └───── Common (from power supply)
   └───────── Normally Open (to equipment)

Example - Heating Element:
Power Supply (+) ──┬─── Heating Element (+)
                   │
Relay COM ─────────┘
Relay NO ──────────────── Heating Element (-)
Power Supply (-) ────────── (complete circuit)

Example - Glycol Pump:
Same configuration, replace heating element with pump
```

## Assembly Instructions

### Step 1: Prepare the Enclosure

1. Mount Raspberry Pi using standoffs
2. Mount relay module with adequate spacing
3. Install terminal blocks for external connections
4. Drill cable entry holes (use grommets)

### Step 2: Wire Temperature Sensors

1. **Strip wires** on DS18B20 probes (typically red, black, yellow)
   - Red = VCC (3.3V)
   - Black = GND
   - Yellow/White = DATA

2. **Connect pull-up resistor** between DATA and VCC (4.7kΩ)

3. **Wire to Raspberry Pi:**
   - All sensor VCC → Pi 3.3V (Pin 1)
   - All sensor GND → Pi GND (Pin 6)
   - All sensor DATA → Pi GPIO 4 (Pin 7)

4. **Label each sensor** with tape/stickers for identification

### Step 3: Wire Relay Module

1. **Power the relay module:**
   - Relay VCC → Pi 5V (Pin 2)
   - Relay GND → Pi GND (Pin 9)

2. **Connect control signals** (use jumper wires):
   - IN1 → GPIO 17 (Pin 11)
   - IN2 → GPIO 27 (Pin 13)
   - ... (continue for all 8 channels)

3. **Wire relay outputs** to terminal blocks for external equipment

### Step 4: External Equipment Connections

⚠️ **DANGER: HIGH VOLTAGE** ⚠️

Only proceed if you're comfortable with electrical wiring. Consider hiring an electrician.

1. **Heating elements:**
   - Use appropriate wire gauge (12-14 AWG for 15A)
   - Install inline fuse (15A recommended)
   - Use relay NO (Normally Open) contact
   - Connect to dedicated circuit breaker

2. **Glycol pumps:**
   - Check pump voltage/current requirements
   - Use appropriate relay rating
   - Install check valve to prevent back-flow

3. **Install temperature probes:**
   - Insert into thermowell in fermenter
   - Or use adhesive mount on fermenter wall
   - Insulate probe from ambient air

### Step 5: Testing

1. **Test sensors first** (no relays connected):
   ```bash
   ls /sys/bus/w1/devices/
   cat /sys/bus/w1/devices/28-*/w1_slave
   ```

2. **Test relays** (no equipment connected):
   - Use manual control in Settings
   - Listen for relay clicks
   - Use multimeter to verify contacts

3. **Test with equipment:**
   - Start with one fermenter
   - Monitor closely for first 24 hours
   - Verify proper heating/cooling

## Safety Considerations

### Electrical Safety

- ⚡ **Never work on live circuits**
- Use properly rated components
- Install circuit breakers/fuses
- Follow local electrical codes
- Consider GFCI protection
- Keep connections dry
- Use strain relief on cables

### Temperature Safety

- Install over-temperature protection
- Use thermal fuses on heating elements
- Monitor for sensor failures
- Don't exceed fermenter temperature ratings
- Consider backup temperature monitoring

### Mechanical Safety

- Secure all mounting hardware
- Prevent water ingress to electronics
- Use proper fermentation pressures
- Install pressure relief valves
- Check for leaks regularly

## Troubleshooting

### Sensors Not Detected

**Issue:** No sensors appear in `/sys/bus/w1/devices/`

**Solutions:**
1. Check 1-wire module is enabled:
   ```bash
   lsmod | grep w1
   sudo modprobe w1-gpio
   sudo modprobe w1-therm
   ```

2. Verify wiring (especially GND)
3. Check pull-up resistor (4.7kΩ)
4. Try one sensor at a time
5. Measure voltage at sensor VCC (should be 3.3V)

### Relays Not Switching

**Issue:** Relay doesn't click or equipment doesn't activate

**Solutions:**
1. Check relay module power (should have LED indicators)
2. Verify GPIO pin connections
3. Test with manual control in app
4. Check relay coil voltage (should be 5V)
5. Measure GPIO output voltage (3.3V)
6. Some relays are active-low (check datasheet)

### Inconsistent Temperature Readings

**Issue:** Temperature jumps or shows errors

**Solutions:**
1. Check sensor connections
2. Verify sensor is properly mounted
3. Ensure sensor is waterproof (check for moisture)
4. Replace faulty sensor
5. Check for electrical interference

### Relay Staying On

**Issue:** Equipment won't turn off

**Solutions:**
1. Check software (emergency stop in app)
2. Verify GPIO control
3. Replace faulty relay
4. Check for stuck mechanical contact
5. Install manual emergency shutoff

## Maintenance

### Monthly

- Check all connections for tightness
- Inspect wires for damage
- Verify relay operation
- Test emergency shutoffs
- Clean dust from enclosure

### Quarterly

- Calibrate temperature sensors (ice bath test)
- Measure relay contact resistance
- Check for corrosion
- Update software
- Test backup power (if installed)

### Annually

- Replace temperature sensors (preventive)
- Check relay module (replace if >10k cycles)
- Deep clean all components
- Review safety systems
- Update documentation

## Upgrades and Expansions

### Adding More Fermenters

To support >4 fermenters:
1. Add second relay module
2. Use I2C GPIO expanders
3. Or use second Raspberry Pi with network communication

### Power Monitoring

Add current sensors to track energy consumption:
- ACS712 current sensor modules
- Connect to analog inputs via MCP3008 ADC

### Backup Systems

- UPS for Raspberry Pi
- Battery backup for critical monitoring
- Redundant temperature sensors
- SMS/push notification backup

### Remote Access

- VPN for secure remote access
- Dynamic DNS for external access
- Mobile app development
- Cloud integration

## Resources

- [Raspberry Pi Pinout](https://pinout.xyz/)
- [DS18B20 Datasheet](https://datasheets.maximintegrated.com/en/ds/DS18B20.pdf)
- [GPIO Safety Guide](https://www.raspberrypi.org/documentation/usage/gpio/)

## Support

For hardware questions:
- Check the GitHub issues
- Join our Discord community
- Post in r/Homebrewing
- Consult with an electrician for safety

---

**Remember: Safety First! When in doubt, consult a professional.**


