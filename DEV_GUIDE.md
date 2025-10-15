# BrewBuddy Development Guide

## Local Development Setup (Windows/Mac/Linux)

This guide will help you set up BrewBuddy for local development without Raspberry Pi hardware.

### Prerequisites

- Python 3.9 or higher
- Node.js 18 or higher
- npm or yarn
- Git

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate virtual environment:**
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # Mac/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create environment file:**
   ```bash
   # Windows
   copy .env.example .env

   # Mac/Linux
   cp .env.example .env
   ```

5. **Edit `.env` file:**
   - Set `HARDWARE_MODE=mock` (important for development without hardware!)
   - Set `DEBUG=true`
   - Change `SECRET_KEY` if desired

6. **Initialize the database:**
   ```bash
   python -m app.init_data
   ```

   This creates:
   - Database tables
   - Default admin user (username: `admin`, password: `admin`)
   - Default settings

7. **Run the development server:**
   ```bash
   python run.py
   ```

   The API will be available at `http://localhost:8000`

8. **View API documentation:**
   - Swagger UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:3000`

4. **Login:**
   - Username: `admin`
   - Password: `admin`

## Development Workflow

### Backend Development

The backend uses FastAPI with auto-reload enabled in development mode. Changes to Python files will automatically restart the server.

**Key directories:**
- `app/models.py` - Database models
- `app/routers/` - API endpoints
- `app/controllers/` - Temperature control logic
- `app/hardware/` - Hardware interfaces (mock vs real)

**Testing hardware without a Pi:**
- The mock hardware interface simulates sensors and relays
- Mock sensors return realistic temperature values with drift
- Mock relays print actions to console

**Adding a new API endpoint:**
1. Create a new router file in `app/routers/`
2. Define your endpoints using FastAPI decorators
3. Import and include the router in `app/main.py`

**Database changes:**
1. Modify models in `app/models.py`
2. Delete the database file
3. Run `python -m app.init_data` to recreate

### Frontend Development

The frontend uses Vite with Hot Module Replacement (HMR) for instant updates.

**Key directories:**
- `src/pages/` - Page components
- `src/components/` - Reusable components
- `src/services/` - API client
- `src/store/` - Zustand state management

**Adding a new page:**
1. Create a new component in `src/pages/`
2. Add the route in `src/App.jsx`
3. Add navigation link in `src/components/Layout.jsx`

**API calls:**
- Use the API client in `src/services/api.js`
- All API calls include authentication automatically
- Example: `const { data } = await fermenterAPI.list()`

**State management:**
- Use Zustand stores in `src/store/useStore.js`
- Settings and auth are persisted to localStorage

### Mock Hardware Simulation

The mock hardware simulates realistic brewing conditions:

**Temperature Simulation:**
- Initial temperatures: 18-21°C for 4 mock sensors
- Gradual temperature drift
- Heating increases temp by 0.05°C per cycle
- Cooling decreases temp by 0.05°C per cycle
- Natural drift toward ambient (20°C)

**Relay Simulation:**
- Prints activation/deactivation to console
- Tracks state for each GPIO pin
- No actual hardware control

**Viewing mock activity:**
```bash
# Backend console will show:
[MOCK] GPIO pin 17 activated (ON)
[MOCK] GPIO pin 17 deactivated (OFF)
```

## Testing Features Locally

### 1. Create Fermenters

Since you don't have real sensors, use the mock sensor IDs:
- `28-00000001`
- `28-00000002`
- `28-00000003`
- `28-00000004`

For GPIO pins, use any numbers (e.g., 17, 18, 27, 22 for heaters)

### 2. Create Beer Profiles

Example profile for testing:
- Phase 1: 24 hours @ 20°C
- Phase 2: 48 hours @ 18°C
- Phase 3: 24 hours @ 22°C

### 3. Create and Start a Batch

1. Create a batch with your profile and fermenter
2. Start the batch
3. Watch the dashboard update in real-time
4. Temperature logs are created every 10 seconds

### 4. Monitor Control Loop

Watch the backend console to see:
- Temperature readings
- Control decisions (heating/cooling/idle)
- Mock relay activations

## Troubleshooting

### Backend won't start

**Error: Module not found**
```bash
# Reinstall dependencies
pip install -r requirements.txt
```

**Error: Database locked**
```bash
# Stop any other instances
# Delete the database and reinitialize
rm brewbuddy.db
python -m app.init_data
```

**Error: Port 8000 already in use**
```bash
# Change port in run.py or kill the process
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:8000 | xargs kill -9
```

### Frontend won't start

**Error: EADDRINUSE**
```bash
# Port 3000 is in use, Vite will suggest another port
# Or kill the process using port 3000
```

**Error: Cannot connect to backend**
- Ensure backend is running on port 8000
- Check proxy configuration in `vite.config.js`
- Check CORS settings in `backend/app/main.py`

### Can't login

- Default credentials: `admin` / `admin`
- If changed, reset by deleting database and running `python -m app.init_data`

### Dashboard not updating

- Check browser console for WebSocket errors
- Ensure backend control loop is running (check console logs)
- Try refreshing the page

## Tips for Development

### Fast Iteration

**Backend hot reload:**
- FastAPI auto-reloads on file changes
- No need to restart manually

**Frontend hot reload:**
- Vite HMR updates instantly
- Preserve state during development

### Debugging

**Backend:**
```python
# Add print statements or use debugger
import pdb; pdb.set_trace()
```

**Frontend:**
```javascript
// Use browser dev tools
console.log('Debug:', data)
```

### Database Browser

To view/edit the SQLite database:
```bash
pip install sqlite-web
sqlite_web brewbuddy.db
```

Access at `http://localhost:8080`

## Building for Production

### Backend
```bash
cd backend
docker build -t brewbuddy-backend .
```

### Frontend
```bash
cd frontend
npm run build
# Output in dist/
```

### Full System
```bash
docker-compose build
```

## Next Steps

1. Explore the API documentation at `/docs`
2. Try creating fermenters, profiles, and batches
3. Monitor the real-time dashboard
4. Check out the analytics page
5. Configure settings to your preference

## Contributing

When contributing:
1. Follow the existing code style
2. Add comments for complex logic
3. Update documentation if adding features
4. Test both mock and real hardware modes (if possible)

## Resources

- FastAPI docs: https://fastapi.tiangolo.com/
- React docs: https://react.dev/
- TailwindCSS: https://tailwindcss.com/
- Recharts: https://recharts.org/
- Zustand: https://github.com/pmndrs/zustand


