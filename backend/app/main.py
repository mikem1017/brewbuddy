from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .database import engine, Base
from .controllers.temperature_controller import temperature_controller
from . import models
from .routers import (
    auth,
    fermenters,
    profiles,
    batches,
    dashboard,
    settings,
    system,
    alerts,
    extras
)
from .config import settings as app_settings


# Create database tables
def init_db():
    """Initialize database tables."""
    Base.metadata.create_all(bind=engine)
    print("Database initialized")


# Lifecycle events
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events."""
    # Startup
    print("Starting BrewBuddy API...")
    init_db()
    
    # Start temperature controller
    temperature_controller.start()
    
    yield
    
    # Shutdown
    print("Shutting down BrewBuddy API...")
    temperature_controller.stop()


# Create FastAPI app
app = FastAPI(
    title="BrewBuddy API",
    description="Fermentation Controller API",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(fermenters.router)
app.include_router(profiles.router)
app.include_router(batches.router)
app.include_router(dashboard.router)
app.include_router(settings.router)
app.include_router(system.router)
app.include_router(alerts.router)
app.include_router(extras.router)


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "name": "BrewBuddy API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=app_settings.debug
    )


