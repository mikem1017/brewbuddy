"""
Seed database with fake data for testing.
Run this after initializing the database.
"""
from app.database import SessionLocal
from app import models
from datetime import datetime, timedelta

def seed_data():
    db = SessionLocal()
    
    try:
        print("Seeding database with test data...")
        
        # Create Fermenters
        print("\n[1/4] Creating fermenters...")
        fermenters_data = [
            {
                "name": "Fermenter 1 - Main",
                "size_liters": 25.0,
                "heater_gpio": 17,
                "chiller_gpio": 27,
                "sensor_id": "28-00000001",
                "status": "clean",
                "relay_cycle_count": 0
            },
            {
                "name": "Fermenter 2 - Secondary",
                "size_liters": 20.0,
                "heater_gpio": 22,
                "chiller_gpio": 23,
                "sensor_id": "28-00000002",
                "status": "clean",
                "relay_cycle_count": 0
            },
            {
                "name": "Fermenter 3 - Experimental",
                "size_liters": 15.0,
                "heater_gpio": 24,
                "chiller_gpio": 25,
                "sensor_id": "28-00000003",
                "status": "clean",
                "relay_cycle_count": 0
            },
            {
                "name": "Fermenter 4 - Lager",
                "size_liters": 30.0,
                "heater_gpio": 5,
                "chiller_gpio": 6,
                "sensor_id": "28-00000004",
                "status": "clean",
                "relay_cycle_count": 0
            }
        ]
        
        for fermenter_data in fermenters_data:
            fermenter = models.Fermenter(**fermenter_data)
            db.add(fermenter)
        
        db.commit()
        print(f"   Created {len(fermenters_data)} fermenters")
        
        # Create Beer Profiles
        print("\n[2/4] Creating beer profiles...")
        
        # Profile 1: Classic IPA
        ipa_profile = models.BeerProfile(
            name="American IPA",
            description="Classic American IPA fermentation schedule with dry hopping phase",
            beer_type="IPA",
            source="local"
        )
        db.add(ipa_profile)
        db.flush()
        
        ipa_phases = [
            models.ProfilePhase(profile_id=ipa_profile.id, sequence_order=0, duration_hours=168, target_temp_celsius=19.0),  # 7 days primary
            models.ProfilePhase(profile_id=ipa_profile.id, sequence_order=1, duration_hours=72, target_temp_celsius=20.0),   # 3 days diacetyl rest
            models.ProfilePhase(profile_id=ipa_profile.id, sequence_order=2, duration_hours=96, target_temp_celsius=18.0),   # 4 days dry hop
        ]
        for phase in ipa_phases:
            db.add(phase)
        
        # Profile 2: German Lager
        lager_profile = models.BeerProfile(
            name="German Lager",
            description="Traditional cold fermentation and lagering schedule",
            beer_type="Lager",
            source="local"
        )
        db.add(lager_profile)
        db.flush()
        
        lager_phases = [
            models.ProfilePhase(profile_id=lager_profile.id, sequence_order=0, duration_hours=240, target_temp_celsius=10.0),  # 10 days primary
            models.ProfilePhase(profile_id=lager_profile.id, sequence_order=1, duration_hours=48, target_temp_celsius=15.0),   # 2 days diacetyl rest
            models.ProfilePhase(profile_id=lager_profile.id, sequence_order=2, duration_hours=336, target_temp_celsius=2.0),   # 14 days lagering
        ]
        for phase in lager_phases:
            db.add(phase)
        
        # Profile 3: Belgian Saison
        saison_profile = models.BeerProfile(
            name="Belgian Saison",
            description="High temperature saison with temperature ramp",
            beer_type="Saison",
            source="local"
        )
        db.add(saison_profile)
        db.flush()
        
        saison_phases = [
            models.ProfilePhase(profile_id=saison_profile.id, sequence_order=0, duration_hours=48, target_temp_celsius=22.0),   # 2 days warm start
            models.ProfilePhase(profile_id=saison_profile.id, sequence_order=1, duration_hours=72, target_temp_celsius=26.0),   # 3 days hot ferment
            models.ProfilePhase(profile_id=saison_profile.id, sequence_order=2, duration_hours=96, target_temp_celsius=23.0),   # 4 days cool down
        ]
        for phase in saison_phases:
            db.add(phase)
        
        # Profile 4: Quick Ale
        ale_profile = models.BeerProfile(
            name="Quick Ale",
            description="Fast fermenting ale for testing",
            beer_type="Pale Ale",
            source="local"
        )
        db.add(ale_profile)
        db.flush()
        
        ale_phases = [
            models.ProfilePhase(profile_id=ale_profile.id, sequence_order=0, duration_hours=24, target_temp_celsius=20.0),   # 1 day primary
            models.ProfilePhase(profile_id=ale_profile.id, sequence_order=1, duration_hours=24, target_temp_celsius=18.0),   # 1 day conditioning
            models.ProfilePhase(profile_id=ale_profile.id, sequence_order=2, duration_hours=12, target_temp_celsius=22.0),   # 12 hours warm
        ]
        for phase in ale_phases:
            db.add(phase)
        
        db.commit()
        print("   Created 4 beer profiles")
        
        # Create some sample batches
        print("\n[3/4] Creating sample batches...")
        
        # Get the created fermenters and profiles
        fermenters = db.query(models.Fermenter).all()
        
        # Batch 1: Active IPA in Fermenter 1 (started 2 days ago)
        batch1 = models.Batch(
            batch_number="BATCH-20251013-001",
            name="Cascade IPA #5",
            notes="Testing new hop schedule with Cascade and Centennial",
            profile_id=ipa_profile.id,
            fermenter_id=fermenters[0].id,
            start_time=datetime.utcnow() - timedelta(hours=48),
            status="active",
            cost_ingredients=45.50
        )
        db.add(batch1)
        fermenters[0].status = "in_use"
        
        # Batch 2: Scheduled Lager in Fermenter 4
        batch2 = models.Batch(
            batch_number="BATCH-20251014-001",
            name="Munich Helles",
            notes="Traditional Bavarian lager, brew day tomorrow",
            profile_id=lager_profile.id,
            fermenter_id=fermenters[3].id,
            scheduled_start=datetime.utcnow() + timedelta(hours=12),
            status="scheduled",
            cost_ingredients=38.25
        )
        db.add(batch2)
        
        # Batch 3: Completed Saison
        batch3 = models.Batch(
            batch_number="BATCH-20251001-001",
            name="Farmhouse Saison",
            notes="Finished fermentation, bottled yesterday",
            profile_id=saison_profile.id,
            fermenter_id=fermenters[1].id,
            start_time=datetime.utcnow() - timedelta(days=10),
            end_time=datetime.utcnow() - timedelta(days=1),
            status="complete",
            cost_ingredients=42.00,
            cost_energy=8.50
        )
        db.add(batch3)
        
        db.commit()
        print("   Created 3 sample batches (1 active, 1 scheduled, 1 complete)")
        
        # Add some temperature logs for the active batch
        print("\n[4/4] Adding temperature history for active batch...")
        
        # Create 48 hours of temperature data (every 10 minutes for demo)
        start_time = batch1.start_time
        current_time = start_time
        end_time = datetime.utcnow()
        
        temp_logs = []
        base_temp = 19.0
        target = 19.0
        
        while current_time < end_time:
            # Simulate realistic temperature variation
            actual_temp = base_temp + (target - base_temp) * 0.1 + ((hash(str(current_time)) % 10) - 5) * 0.1
            control_state = "idle"
            
            if actual_temp < target - 0.5:
                control_state = "heating"
            elif actual_temp > target + 0.5:
                control_state = "cooling"
            
            log = models.TemperatureLog(
                batch_id=batch1.id,
                timestamp=current_time,
                actual_temp=round(actual_temp, 2),
                target_temp=target,
                control_state=control_state,
                power_consumed_wh=0.5 if control_state != "idle" else 0
            )
            temp_logs.append(log)
            
            current_time += timedelta(minutes=10)
            base_temp = actual_temp  # Temperature carries forward
        
        # Add logs in batches
        for log in temp_logs:
            db.add(log)
        
        db.commit()
        print(f"   Created {len(temp_logs)} temperature log entries")
        
        # Add some gravity readings for completed batch
        gravity1 = models.GravityReading(
            batch_id=batch3.id,
            timestamp=datetime.utcnow() - timedelta(days=9),
            gravity_sg=1.050,
            temperature=20.0,
            notes="Original gravity"
        )
        gravity2 = models.GravityReading(
            batch_id=batch3.id,
            timestamp=datetime.utcnow() - timedelta(days=5),
            gravity_sg=1.020,
            temperature=22.0,
            notes="Halfway through"
        )
        gravity3 = models.GravityReading(
            batch_id=batch3.id,
            timestamp=datetime.utcnow() - timedelta(days=1),
            gravity_sg=1.010,
            temperature=23.0,
            notes="Final gravity"
        )
        db.add_all([gravity1, gravity2, gravity3])
        
        # Add journal entry
        journal = models.BatchJournal(
            batch_id=batch3.id,
            timestamp=datetime.utcnow() - timedelta(days=7),
            entry_text="Fermentation very active, krausen 2 inches high. Beautiful fruity esters developing!",
            images_json=None
        )
        db.add(journal)
        
        db.commit()
        print("   Added gravity readings and journal entry")
        
        print("\n" + "="*50)
        print("[SUCCESS] Database seeded with test data!")
        print("="*50)
        print("\nTest Data Summary:")
        print("  • 4 Fermenters (all configured with mock sensors)")
        print("  • 4 Beer Profiles (IPA, Lager, Saison, Quick Ale)")
        print("  • 3 Batches:")
        print("    - 1 Active (Cascade IPA, running for 2 days)")
        print("    - 1 Scheduled (Munich Helles, starts tomorrow)")
        print("    - 1 Complete (Farmhouse Saison)")
        print(f"  • {len(temp_logs)} Temperature logs")
        print("  • 3 Gravity readings")
        print("\nGo to http://localhost:3002 to see it all!")
        print("\n")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()


