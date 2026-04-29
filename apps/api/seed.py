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
    ("admin@educontent.com",   "Admin@1234",   "Admin",          "platform_admin"),
    ("school1@educontent.com", "School1@1234", "School One",     "school_admin"),
    ("school2@educontent.com", "School2@1234", "School Two",     "school_admin"),
    ("teacher@school1.com",    "Teacher@1234", "Teacher School1","teacher"),
]

async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        from sqlalchemy import select

        # --- Schools (needed before school users) ---
        school1 = await db.scalar(select(School).where(School.school_name == "School One"))
        if not school1:
            school1 = School(
                school_name="School One",
                school_id="SCH001",
                email="school1@educontent.com",
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
                email="school2@educontent.com",
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
                if role == "school" and "school1" in email:
                    school_id = school1.id
                elif role == "school" and "school2" in email:
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
            db.add(SystemSettings(app_name="EduContent"))
            print("Created system settings")

        await db.commit()
        print("Seed complete.")

if __name__ == "__main__":
    asyncio.run(seed())
