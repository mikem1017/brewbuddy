# BrewBuddy Quick Start Guide

Get up and running in 5 minutes on your local machine!

## Prerequisites

- Python 3.9+ installed
- Node.js 18+ installed
- Git installed

## 1. Clone or Navigate to Project

```bash
cd brewbuddy
```

## 2. Start Backend (Terminal 1)

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
# Windows:
copy .env.example .env
# Mac/Linux:
cp .env.example .env

# Initialize database (creates admin user)
python -m app.init_data

# Start server
python run.py
```

✅ Backend running at `http://localhost:8000`

## 3. Start Frontend (Terminal 2)

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

✅ Frontend running at `http://localhost:3000`

## 4. Login

Open your browser to `http://localhost:3000`

**Default Credentials:**
- Username: `admin`
- Password: `admin`

⚠️ Change this immediately in production!

## 5. Create Your First Fermenter

1. Navigate to **Fermenters** page
2. Click **Add Fermenter**
3. Fill in details:
   - Name: `Fermenter 1`
   - Size: `20` liters
   - Heater GPIO: `17`
   - Chiller GPIO: `27`
   - Sensor: Select `28-00000001` (mock sensor)
4. Click **Create Fermenter**

## 6. Create a Beer Profile

1. Navigate to **Beer Profiles** page
2. Click **New Profile**
3. Fill in details:
   - Name: `Test Lager`
   - Type: `Lager`
   - Description: `Test profile for development`
4. Add phases:
   - Phase 1: `24` hours @ `20`°C (Click **Add Phase**)
   - Phase 2: `48` hours @ `18`°C (Click **Add Phase**)
   - Phase 3: `24` hours @ `22`°C (Click **Add Phase**)
5. Review the temperature graph
6. Click **Create Profile**

## 7. Create and Start a Batch

1. Navigate to **Batches** page
2. Click **New Batch**
3. Fill in details:
   - Name: `My First Brew`
   - Profile: Select `Test Lager`
   - Fermenter: Select `Fermenter 1`
   - Notes: `First test batch`
4. Click **Create Batch**
5. Click **Start** on your new batch

## 8. Monitor Your Batch

1. Navigate to **Dashboard**
2. Watch real-time updates!
   - Current temperature
   - Target temperature
   - Control state (Heating/Cooling/Idle)
   - Phase progress
   - Live temperature chart

The control loop runs every 10 seconds, updating temperature logs.

## What's Happening?

In development mode with mock hardware:
- **Mock sensors** provide simulated temperatures
- **Mock relays** print to console when activated
- **Temperature drifts** naturally toward 20°C
- **Heating/cooling** slightly adjusts temperature
- **Control loop** makes decisions every 10 seconds

Check your backend console to see:
```
[MOCK] GPIO pin 17 activated (ON)
[MOCK] GPIO pin 27 deactivated (OFF)
```

## Explore Other Features

### Settings
- Change temperature units (C/F)
- Switch themes (Dark/Light)
- Configure graph display
- Set up notifications

### Alerts
- Create temperature alert rules
- View alert history

### Analytics
- View batch statistics
- See fermenter usage
- Check system health

### Batch Details
- Click on a batch to see detailed view
- Export temperature logs to CSV
- View full temperature history

## Next Steps

### For Development
- Read `DEV_GUIDE.md` for detailed development info
- Explore the API docs at `http://localhost:8000/docs`
- Modify code and see hot-reload in action

### For Production
- Read `HARDWARE_GUIDE.md` for wiring instructions
- Transfer to Raspberry Pi
- Run `setup.sh` for automated installation
- Configure real hardware

## Troubleshooting

**Backend won't start:**
```bash
# Make sure you're in the virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

**Frontend won't start:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

**Can't login:**
- Use `admin` / `admin`
- If database is corrupted, delete `brewbuddy.db` and run `python -m app.init_data` again

**No temperature data:**
- Check that the batch is started
- Look at backend console for temperature readings
- Refresh the dashboard page

## Key Commands Reference

### Backend
```bash
cd backend
venv\Scripts\activate        # Activate venv (Windows)
source venv/bin/activate     # Activate venv (Mac/Linux)
python run.py                # Start server
python -m app.init_data      # Reset database
```

### Frontend
```bash
cd frontend
npm install                  # Install dependencies
npm run dev                  # Start dev server
npm run build                # Build for production
```

### Docker (Alternative)
```bash
docker-compose -f docker-compose.dev.yml up    # Start everything
docker-compose -f docker-compose.dev.yml down  # Stop everything
```

## API Access

You can also interact with the API directly:

**Get Access Token:**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin"
```

**API Documentation:**
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Need Help?

- 📖 Read `README.md` for complete documentation
- 🔧 Check `DEV_GUIDE.md` for development details
- ⚡ See `HARDWARE_GUIDE.md` for hardware setup
- 📊 Review `PROJECT_SUMMARY.md` for project overview
- 🐛 Check backend/frontend console for errors

---

**Happy Brewing! 🍺**

You're now ready to monitor and control your fermentations!


