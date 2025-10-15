# 🍺 BrewBuddy - Fermentation Controller

A professional-grade fermentation temperature controller system for homebrewers, designed to run on Raspberry Pi with a modern React frontend and Python FastAPI backend.

## Features

### 🌡️ Temperature Control
- Precise hysteresis-based temperature control
- Support for up to 4 independent fermenters
- DS18B20 1-wire temperature sensors
- Dual relay control (heating & glycol chilling)
- Real-time monitoring and adjustments
- Safety interlocks and timeouts

### 📊 Beer Profiles
- Create custom temperature profiles with multiple phases
- Visual temperature profile graphs
- Support for complex fermentation schedules
- Import/export profiles for sharing
- Clone profiles for quick setup

### 🔬 Batch Management
- Full CRUD operations on batches
- Auto-generated batch numbering (BATCH-YYYYMMDD-XXX)
- Start/stop batch controls
- Clone previous batches
- Cost tracking (ingredients, energy)
- Batch journal with notes and images
- Gravity readings integration
- Export temperature logs to CSV

### 📈 Real-time Dashboard
- Live temperature monitoring via WebSocket
- Interactive temperature charts
- Current phase progress indicators
- Control state visualization (heating/cooling/idle)
- Multiple batch monitoring simultaneously

### 🔔 Alerts & Notifications
- Configurable alert rules per fermenter
- High/low temperature alerts
- Phase completion notifications
- Email notifications (SMTP)
- Daily/weekly summary emails
- Alert history and acknowledgment

### ⚙️ Settings & Configuration
- Temperature units (Celsius/Fahrenheit)
- Volume units (Liters/Gallons)
- Theme selection (Light/Dark/High Contrast/Brew Master)
- Graph display options
- Live plotting toggle
- Email notification preferences

### 📊 Analytics
- Batch statistics and trends
- Fermenter usage analytics
- System health monitoring
- Cost tracking and reports
- Historical data visualization

### 🔧 System Features
- Manual relay control for testing
- Sensor health monitoring
- System health dashboard
- Audit logging
- Multi-user support with roles
- Progressive Web App (PWA) support
- Maintenance scheduling
- Equipment lifecycle tracking

## Hardware Requirements

### Required Components
- Raspberry Pi 3/4 (recommended: Pi 4 with 2GB+ RAM)
- MicroSD card (16GB+ recommended)
- 4x DS18B20 temperature sensors (1-wire)
- 8x Relay module (for heating and chilling control)
- Power supply for Raspberry Pi
- 12V/24V power supply for relays (depending on your equipment)

### Wiring
- **Temperature Sensors**: Connect to GPIO 4 (configurable)
- **Relays**: Configure GPIO pins per fermenter (e.g., 17, 18, 27, 22 for heaters; 23, 24, 25, 5 for chillers)

## Installation

### Quick Start (Raspberry Pi)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/brewbuddy.git
   cd brewbuddy
   ```

2. **Run the setup script:**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

3. **Access the application:**
   - Open your browser to `http://<raspberry-pi-ip>`
   - Default credentials: `admin` / `admin`
   - **Change the password immediately!**

### Manual Installation

#### Prerequisites
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt-get update
sudo apt-get install -y docker-compose

# Enable 1-wire interface
echo "dtoverlay=w1-gpio,gpiopin=4" | sudo tee -a /boot/config.txt
sudo reboot
```

#### Build and Run
```bash
# Create environment file
cp backend/.env.example backend/.env
# Edit backend/.env and set your SECRET_KEY

# Build containers
docker-compose build

# Start services
docker-compose up -d

# Initialize database
docker-compose exec backend python -m app.init_data
```

## Local Development

### Backend (Python/FastAPI)

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env and set HARDWARE_MODE=mock for local development

# Initialize database
python -m app.init_data

# Run development server
python run.py
```

API will be available at `http://localhost:8000`
API documentation at `http://localhost:8000/docs`

### Frontend (React/Vite)

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend will be available at `http://localhost:3000`

### Docker Development

```bash
# Use development docker-compose
docker-compose -f docker-compose.dev.yml up
```

## Configuration

### Environment Variables (Backend)

```bash
# Environment
ENVIRONMENT=production  # development, production
DEBUG=false

# Hardware
HARDWARE_MODE=real  # real (Raspberry Pi) or mock (development)

# Database
DATABASE_URL=sqlite:///./brewbuddy.db

# Security
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# SMTP (for email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=brewbuddy@yourdomain.com

# Control Loop
CONTROL_LOOP_INTERVAL=10  # seconds
HYSTERESIS_TEMP=0.5  # degrees Celsius
SENSOR_TIMEOUT=60  # seconds
```

## API Documentation

The API is fully documented using OpenAPI (Swagger). Access the interactive documentation at:
- **Swagger UI**: `http://<your-server>/docs`
- **ReDoc**: `http://<your-server>/redoc`

### Key Endpoints

- `POST /api/auth/login` - Authenticate and get token
- `GET /api/dashboard` - Get all active batches status
- `GET /api/fermenters` - List all fermenters
- `POST /api/batches` - Create a new batch
- `POST /api/batches/{id}/start` - Start a batch
- `WS /api/dashboard/ws` - WebSocket for real-time updates

## Architecture

### Technology Stack

**Backend:**
- FastAPI (Python 3.9+)
- SQLAlchemy ORM with SQLite
- APScheduler for control loop
- JWT authentication
- WebSocket support

**Frontend:**
- React 18 with Vite
- TailwindCSS for styling
- Zustand for state management
- Recharts for data visualization
- Axios for API calls
- PWA support

**Hardware:**
- RPi.GPIO for relay control
- w1thermsensor for DS18B20 sensors
- Mock interfaces for development

### System Architecture

```
┌─────────────────────────────────────┐
│         React Frontend (PWA)         │
│  Dashboard | Fermenters | Profiles   │
│  Batches | Analytics | Settings      │
└────────────┬────────────────────────┘
             │ HTTP/WebSocket
┌────────────▼────────────────────────┐
│        FastAPI Backend               │
│  ┌──────────────────────────────┐   │
│  │  Temperature Controller       │   │
│  │  (10-second control loop)     │   │
│  └────┬────────────────┬─────────┘   │
│       │                │              │
│  ┌────▼────┐      ┌────▼────┐        │
│  │ GPIO     │      │ 1-Wire  │        │
│  │ Relays   │      │ Sensors │        │
│  └──────────┘      └──────────┘       │
└─────────────────────────────────────┘
```

## Safety Features

- **Mutex lock** prevents simultaneous heating and chilling
- **Sensor timeout** detection turns off relays if sensor fails
- **GPIO validation** before starting batches
- **Graceful shutdown** handler
- **Audit logging** for all critical actions
- **User role-based access control**

## Troubleshooting

### Temperature sensors not detected
```bash
# Check 1-wire module is loaded
lsmod | grep w1

# Load modules manually
sudo modprobe w1-gpio
sudo modprobe w1-therm

# Check for sensors
ls /sys/bus/w1/devices/
```

### Relays not responding
- Verify GPIO pins in fermenter configuration
- Check relay module power supply
- Test manual control from Settings > System > Manual Control

### Container issues
```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Database issues
```bash
# Backup database
docker-compose exec backend cp /data/brewbuddy.db /data/brewbuddy.db.backup

# Reset database
docker-compose exec backend python -m app.init_data
```

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built for homebrewers by homebrewers
- Inspired by various open-source brewing projects
- Thanks to the Python, React, and Raspberry Pi communities

## Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Check the documentation at `/docs`
- Join our community discussions

## Roadmap

- [ ] Integration with Brewfather/Brewer's Friend APIs
- [ ] Mobile app (iOS/Android)
- [ ] Advanced PID tuning interface
- [ ] Multi-language support
- [ ] Cloud sync and remote monitoring
- [ ] Recipe calculator integration
- [ ] Automated CIP (Clean In Place) cycles
- [ ] Voice assistant integration

---

**Happy Brewing! 🍺**
