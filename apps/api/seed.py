"""
Seed script: creates all default users, maintenance mode, and system settings.
Run inside container: python seed.py
"""
import asyncio
from app.database import AsyncSessionLocal, engine, Base
from app.models import *
from app.auth import hash_password

USERS = [
    # email, password, name, role
    ("admin@iiconacademy.com",   "Admin@1234",   "Admin",          "platform_admin"),
    ("school1@iiconacademy.com", "School1@1234", "School One",     "school_admin"),
    ("school2@iiconacademy.com", "School2@1234", "School Two",     "school_admin"),
    ("teacher@school1.com",    "Teacher@1234", "Teacher School1","teacher"),
]

async def seed():
    print("Starting seed process...")
    print(f"Database URL: {engine.url}")

    try:
        from migrate_schema import run_migrations
        await run_migrations()
        print("Database schema migrated successfully")
    except Exception as e:
        print(f"ERROR migrating schema: {e}")
        raise

    async with AsyncSessionLocal() as db:
        from sqlalchemy import select

        # --- Schools (needed before school users) ---
        school1 = await db.scalar(select(School).where(School.school_name == "School One"))
        if not school1:
            school1 = School(
                school_name="School One",
                school_id="SCH001",
                email="school1@iiconacademy.com",
                is_active=True,
            )
            db.add(school1)
            await db.flush()
            print("Created school: School One (SCH001)")

        school2 = await db.scalar(select(School).where(School.school_name == "School Two"))
        if not school2:
            school2 = School(
                school_name="School Two",
                school_id="SCH002",
                email="school2@iiconacademy.com",
                is_active=True,
            )
            db.add(school2)
            await db.flush()
            print("Created school: School Two (SCH002)")

        # --- Users ---
        for email, password, name, role in USERS:
            existing = await db.scalar(select(User).where(User.email == email))
            if not existing:
                school_id = None
                if role in ("school", "school_admin", "school_viewer") and "school1" in email:
                    school_id = school1.id
                elif role in ("school", "school_admin", "school_viewer") and "school2" in email:
                    school_id = school2.id
                elif role == "teacher":
                    school_id = school1.id

                user = User(
                    email=email,
                    password_hash=hash_password(password),
                    name=name,
                    role=role,
                    school_id=school_id,
                    is_active=True,
                    verified=True,
                )
                db.add(user)
                print(f"Created {role}: {email} / {password}")

        # --- Maintenance mode ---
        mm = await db.scalar(select(MaintenanceMode))
        if not mm:
            db.add(MaintenanceMode(is_enabled=False, message=""))
            print("Created maintenance mode record")

        # --- System settings ---
        ss = await db.scalar(select(SystemSettings))
        if not ss:
            db.add(SystemSettings(app_name="i-icon academy"))
            print("Created system settings")

        # --- Sample Categories ---
        categories_data = [
            ("Mathematics", "academic", "Mathematics and related subjects", True, 1),
            ("Science", "academic", "Science subjects", True, 2),
            ("Languages", "academic", "Language learning materials", True, 3),
            ("Arts", "extracurricular", "Arts and creative subjects", True, 4),
            ("Sports", "extracurricular", "Sports and physical education", True, 5),
        ]
        
        for cat_name, cat_type, desc, active, order in categories_data:
            existing_cat = await db.scalar(select(Category).where(Category.category_name == cat_name))
            if not existing_cat:
                cat = Category(
                    category_name=cat_name,
                    category_type=cat_type,
                    description=desc,
                    is_active=active,
                    display_order=order,
                )
                db.add(cat)
                print(f"Created category: {cat_name}")

        await db.commit()
        print("Seed complete.")

if __name__ == "__main__":
    try:
        asyncio.run(seed())
    except Exception as e:
        print(f"ERROR during seed: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
