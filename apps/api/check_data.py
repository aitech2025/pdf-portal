"""
Check database data - verify what's in the database
"""
import asyncio
from sqlalchemy import select, func, text
from app.database import AsyncSessionLocal
from app.models import (
    User, School, Category, SubCategory, PDF, 
    Notification, SystemSettings, MaintenanceMode
)

async def check_data():
    print("=" * 60)
    print("DATABASE DATA CHECK")
    print("=" * 60)
    
    async with AsyncSessionLocal() as db:
        # Check users
        result = await db.execute(select(func.count(User.id)))
        user_count = result.scalar()
        print(f"\n✓ Users: {user_count}")
        
        if user_count > 0:
            result = await db.execute(select(User).limit(5))
            users = result.scalars().all()
            for user in users:
                print(f"  - {user.email} ({user.role})")
        
        # Check schools
        result = await db.execute(select(func.count(School.id)))
        school_count = result.scalar()
        print(f"\n✓ Schools: {school_count}")
        
        if school_count > 0:
            result = await db.execute(select(School))
            schools = result.scalars().all()
            for school in schools:
                print(f"  - {school.school_name} ({school.school_id})")
        
        # Check categories
        result = await db.execute(select(func.count(Category.id)))
        cat_count = result.scalar()
        print(f"\n✓ Categories: {cat_count}")
        
        if cat_count > 0:
            result = await db.execute(select(Category))
            categories = result.scalars().all()
            for cat in categories:
                print(f"  - {cat.category_name} (type: {cat.category_type}, active: {cat.is_active})")
        
        # Check subcategories
        result = await db.execute(select(func.count(SubCategory.id)))
        subcat_count = result.scalar()
        print(f"\n✓ SubCategories: {subcat_count}")
        
        if subcat_count > 0:
            result = await db.execute(select(SubCategory).limit(10))
            subcats = result.scalars().all()
            for sub in subcats:
                print(f"  - {sub.sub_category_name} (category_id: {sub.category_id})")
        
        # Check PDFs
        result = await db.execute(select(func.count(PDF.id)))
        pdf_count = result.scalar()
        print(f"\n✓ PDFs: {pdf_count}")
        
        if pdf_count > 0:
            result = await db.execute(select(PDF).limit(5))
            pdfs = result.scalars().all()
            for pdf in pdfs:
                print(f"  - {pdf.title} (category: {pdf.category_id})")
        
        # Check notifications
        result = await db.execute(select(func.count(Notification.id)))
        notif_count = result.scalar()
        print(f"\n✓ Notifications: {notif_count}")
        
        # Check system settings
        result = await db.execute(select(SystemSettings))
        settings = result.scalar_one_or_none()
        print(f"\n✓ System Settings: {'Configured' if settings else 'Not configured'}")
        if settings:
            print(f"  - App Name: {settings.app_name}")
        
        # Check maintenance mode
        result = await db.execute(select(MaintenanceMode))
        mm = result.scalar_one_or_none()
        print(f"\n✓ Maintenance Mode: {'Configured' if mm else 'Not configured'}")
        if mm:
            print(f"  - Enabled: {mm.is_enabled}")
        
        # Check all tables
        print("\n" + "=" * 60)
        print("ALL TABLES IN DATABASE")
        print("=" * 60)
        result = await db.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """))
        tables = result.scalars().all()
        for table in tables:
            # Get row count
            count_result = await db.execute(text(f"SELECT COUNT(*) FROM {table}"))
            count = count_result.scalar()
            print(f"  - {table}: {count} rows")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    asyncio.run(check_data())
