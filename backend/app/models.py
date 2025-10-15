from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="brewer")  # admin, brewer, viewer
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    batches = relationship("Batch", back_populates="creator")
    journal_entries = relationship("BatchJournal", back_populates="creator")
    audit_logs = relationship("AuditLog", back_populates="user")


class Fermenter(Base):
    __tablename__ = "fermenters"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    size_liters = Column(Float, nullable=False)
    heater_gpio = Column(Integer, nullable=False)
    chiller_gpio = Column(Integer, nullable=False)
    sensor_id = Column(String(100), nullable=False)
    status = Column(String(20), default="clean")  # in_use, clean, needs_cleaning, maintenance
    last_maintenance = Column(DateTime(timezone=True))
    relay_cycle_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    batches = relationship("Batch", back_populates="fermenter")
    alert_rules = relationship("AlertRule", back_populates="fermenter", cascade="all, delete-orphan")
    maintenance_schedule = relationship("MaintenanceSchedule", back_populates="fermenter", cascade="all, delete-orphan")


class BeerProfile(Base):
    __tablename__ = "beer_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    beer_type = Column(String(50))
    source = Column(String(50), default="local")  # local, imported, brewfather, brewers_friend
    external_id = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    phases = relationship("ProfilePhase", back_populates="profile", cascade="all, delete-orphan", order_by="ProfilePhase.sequence_order")
    batches = relationship("Batch", back_populates="profile")


class ProfilePhase(Base):
    __tablename__ = "profile_phases"
    
    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("beer_profiles.id", ondelete="CASCADE"), nullable=False)
    sequence_order = Column(Integer, nullable=False)
    duration_hours = Column(Float, nullable=False)
    target_temp_celsius = Column(Float, nullable=False)
    
    # Relationships
    profile = relationship("BeerProfile", back_populates="phases")


class Batch(Base):
    __tablename__ = "batches"
    
    id = Column(Integer, primary_key=True, index=True)
    batch_number = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    notes = Column(Text)
    profile_id = Column(Integer, ForeignKey("beer_profiles.id"), nullable=False)
    fermenter_id = Column(Integer, ForeignKey("fermenters.id"), nullable=False)
    start_time = Column(DateTime(timezone=True))
    end_time = Column(DateTime(timezone=True))
    scheduled_start = Column(DateTime(timezone=True))
    status = Column(String(20), default="scheduled")  # scheduled, active, complete, cancelled
    cost_ingredients = Column(Float)
    cost_energy = Column(Float)
    created_by_user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    profile = relationship("BeerProfile", back_populates="batches")
    fermenter = relationship("Fermenter", back_populates="batches")
    creator = relationship("User", back_populates="batches")
    temperature_logs = relationship("TemperatureLog", back_populates="batch", cascade="all, delete-orphan")
    gravity_readings = relationship("GravityReading", back_populates="batch", cascade="all, delete-orphan")
    journal_entries = relationship("BatchJournal", back_populates="batch", cascade="all, delete-orphan")
    brew_session = relationship("BrewSession", back_populates="batch", uselist=False, cascade="all, delete-orphan")
    alert_history = relationship("AlertHistory", back_populates="batch", cascade="all, delete-orphan")


class TemperatureLog(Base):
    __tablename__ = "temperature_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    actual_temp = Column(Float, nullable=False)
    target_temp = Column(Float, nullable=False)
    control_state = Column(String(20), nullable=False)  # heating, cooling, idle
    power_consumed_wh = Column(Float, default=0)
    
    # Relationships
    batch = relationship("Batch", back_populates="temperature_logs")


class Settings(Base):
    __tablename__ = "settings"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AlertRule(Base):
    __tablename__ = "alert_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    fermenter_id = Column(Integer, ForeignKey("fermenters.id", ondelete="CASCADE"), nullable=False)
    rule_type = Column(String(50), nullable=False)  # temp_high, temp_low, phase_complete
    threshold = Column(Float)
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    fermenter = relationship("Fermenter", back_populates="alert_rules")
    alert_history = relationship("AlertHistory", back_populates="alert_rule", cascade="all, delete-orphan")


class AlertHistory(Base):
    __tablename__ = "alert_history"
    
    id = Column(Integer, primary_key=True, index=True)
    alert_rule_id = Column(Integer, ForeignKey("alert_rules.id", ondelete="CASCADE"))
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"))
    triggered_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    message = Column(Text, nullable=False)
    acknowledged = Column(Boolean, default=False)
    
    # Relationships
    alert_rule = relationship("AlertRule", back_populates="alert_history")
    batch = relationship("Batch", back_populates="alert_history")


class AuditLog(Base):
    __tablename__ = "audit_log"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String(50), nullable=False)  # create, update, delete, start, stop
    entity_type = Column(String(50), nullable=False)  # batch, fermenter, profile, settings
    entity_id = Column(Integer)
    changes_json = Column(JSON)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")


class GravityReading(Base):
    __tablename__ = "gravity_readings"
    
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    gravity_sg = Column(Float, nullable=False)
    temperature = Column(Float)
    notes = Column(Text)
    
    # Relationships
    batch = relationship("Batch", back_populates="gravity_readings")


class BatchJournal(Base):
    __tablename__ = "batch_journal"
    
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    entry_text = Column(Text, nullable=False)
    images_json = Column(JSON)  # Array of image paths
    created_by_user_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    batch = relationship("Batch", back_populates="journal_entries")
    creator = relationship("User", back_populates="journal_entries")


class MaintenanceSchedule(Base):
    __tablename__ = "maintenance_schedule"
    
    id = Column(Integer, primary_key=True, index=True)
    fermenter_id = Column(Integer, ForeignKey("fermenters.id", ondelete="CASCADE"), nullable=False)
    task_type = Column(String(100), nullable=False)  # sensor_calibration, deep_clean, inspection
    interval_days = Column(Integer, nullable=False)
    last_completed = Column(DateTime(timezone=True))
    next_due = Column(DateTime(timezone=True))
    notes = Column(Text)
    
    # Relationships
    fermenter = relationship("Fermenter", back_populates="maintenance_schedule")


class Webhook(Base):
    __tablename__ = "webhooks"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    url = Column(String(500), nullable=False)
    events_json = Column(JSON, nullable=False)  # Array of event types to trigger on
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class BrewSession(Base):
    __tablename__ = "brew_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False, unique=True)
    brew_date = Column(DateTime(timezone=True))
    mash_temp = Column(Float)
    boil_time = Column(Integer)  # minutes
    og = Column(Float)  # Original Gravity
    fg = Column(Float)  # Final Gravity
    abv = Column(Float)  # Alcohol by Volume
    carbonation_target = Column(Float)  # volumes of CO2
    notes = Column(Text)
    
    # Relationships
    batch = relationship("Batch", back_populates="brew_session")


