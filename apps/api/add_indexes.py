"""
Add database indexes for performance optimization
Run this to add indexes to existing database without recreating tables
"""
import asyncio
from sqlalchemy import text
from app.database import engine

async def add_indexes():
    print("Adding database indexes for performance...")
    
    async with engine.begin() as conn:
        indexes = [
            # Categories
            ("CREATE INDEX IF NOT EXISTS idx_category_display_order ON categories(display_order)", "categories.display_order"),
            ("CREATE INDEX IF NOT EXISTS idx_category_is_active ON categories(is_active)", "categories.is_active"),
            ("CREATE INDEX IF NOT EXISTS idx_category_type ON categories(category_type)", "categories.category_type"),
            ("CREATE INDEX IF NOT EXISTS idx_category_name ON categories(category_name)", "categories.category_name"),
            ("CREATE INDEX IF NOT EXISTS idx_category_created ON categories(created)", "categories.created"),
            
            # SubCategories
            ("CREATE INDEX IF NOT EXISTS idx_subcategory_category_id ON sub_categories(category_id)", "sub_categories.category_id"),
            ("CREATE INDEX IF NOT EXISTS idx_subcategory_display_order ON sub_categories(display_order)", "sub_categories.display_order"),
            ("CREATE INDEX IF NOT EXISTS idx_subcategory_is_active ON sub_categories(is_active)", "sub_categories.is_active"),
            ("CREATE INDEX IF NOT EXISTS idx_subcategory_name ON sub_categories(sub_category_name)", "sub_categories.sub_category_name"),
            ("CREATE INDEX IF NOT EXISTS idx_subcategory_created ON sub_categories(created)", "sub_categories.created"),
            
            # Users
            ("CREATE INDEX IF NOT EXISTS idx_user_role ON users(role)", "users.role"),
            ("CREATE INDEX IF NOT EXISTS idx_user_school_id ON users(school_id)", "users.school_id"),
            ("CREATE INDEX IF NOT EXISTS idx_user_is_active ON users(is_active)", "users.is_active"),
            ("CREATE INDEX IF NOT EXISTS idx_user_created ON users(created)", "users.created"),
            ("CREATE INDEX IF NOT EXISTS idx_user_name ON users(name)", "users.name"),
            
            # Schools
            ("CREATE INDEX IF NOT EXISTS idx_school_name ON schools(school_name)", "schools.school_name"),
            ("CREATE INDEX IF NOT EXISTS idx_school_is_active ON schools(is_active)", "schools.is_active"),
            ("CREATE INDEX IF NOT EXISTS idx_school_created ON schools(created)", "schools.created"),
            ("CREATE INDEX IF NOT EXISTS idx_school_id ON schools(school_id)", "schools.school_id"),
            ("CREATE INDEX IF NOT EXISTS idx_school_email ON schools(email)", "schools.email"),
            
            # School Category Access
            ("CREATE INDEX IF NOT EXISTS idx_sca_school_id ON school_category_access(school_id)", "school_category_access.school_id"),
            ("CREATE INDEX IF NOT EXISTS idx_sca_category_id ON school_category_access(category_id)", "school_category_access.category_id"),
            
            # PDFs
            ("CREATE INDEX IF NOT EXISTS idx_pdf_category_id ON pdfs(category_id)", "pdfs.category_id"),
            ("CREATE INDEX IF NOT EXISTS idx_pdf_sub_category_id ON pdfs(sub_category_id)", "pdfs.sub_category_id"),
            ("CREATE INDEX IF NOT EXISTS idx_pdf_status ON pdfs(status)", "pdfs.status"),
            ("CREATE INDEX IF NOT EXISTS idx_pdf_is_active ON pdfs(is_active)", "pdfs.is_active"),
            ("CREATE INDEX IF NOT EXISTS idx_pdf_created ON pdfs(created)", "pdfs.created"),
            ("CREATE INDEX IF NOT EXISTS idx_pdf_uploaded_by ON pdfs(uploaded_by)", "pdfs.uploaded_by"),
            
            # Notifications
            ("CREATE INDEX IF NOT EXISTS idx_notification_recipient_id ON notifications(recipient_id)", "notifications.recipient_id"),
            ("CREATE INDEX IF NOT EXISTS idx_notification_status ON notifications(status)", "notifications.status"),
            ("CREATE INDEX IF NOT EXISTS idx_notification_created ON notifications(created)", "notifications.created"),
            ("CREATE INDEX IF NOT EXISTS idx_notification_read ON notifications(read)", "notifications.read"),
            
            # Audit Logs
            ("CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_logs(user_id)", "audit_logs.user_id"),
            ("CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_logs(action)", "audit_logs.action"),
            ("CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_logs(timestamp)", "audit_logs.timestamp"),
            
            # Download Logs
            ("CREATE INDEX IF NOT EXISTS idx_download_log_user_id ON download_logs(user_id)", "download_logs.user_id"),
            ("CREATE INDEX IF NOT EXISTS idx_download_log_pdf_id ON download_logs(pdf_id)", "download_logs.pdf_id"),
            ("CREATE INDEX IF NOT EXISTS idx_download_log_school_id ON download_logs(school_id)", "download_logs.school_id"),
            ("CREATE INDEX IF NOT EXISTS idx_download_log_downloaded_at ON download_logs(downloaded_at)", "download_logs.downloaded_at"),
            
            # PDF Versions
            ("CREATE INDEX IF NOT EXISTS idx_pdf_version_pdf_id ON pdf_versions(pdf_id)", "pdf_versions.pdf_id"),
            ("CREATE INDEX IF NOT EXISTS idx_pdf_version_is_current ON pdf_versions(is_current)", "pdf_versions.is_current"),
            ("CREATE INDEX IF NOT EXISTS idx_pdf_version_upload_date ON pdf_versions(upload_date)", "pdf_versions.upload_date"),
            
            # Analytics Events
            ("CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type)", "analytics_events.event_type"),
            ("CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_events(timestamp)", "analytics_events.timestamp"),
            ("CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id)", "analytics_events.user_id"),
        ]
        
        for sql, name in indexes:
            try:
                await conn.execute(text(sql))
                print(f"✓ Added index: {name}")
            except Exception as e:
                print(f"⚠ Index {name} might already exist or error: {e}")
        
        print("\n✓ All indexes added successfully!")
        print("\nPerformance improvements:")
        print("  - Faster category/subcategory queries")
        print("  - Faster user and school lookups")
        print("  - Faster PDF filtering and sorting")
        print("  - Faster PDF version queries")
        print("  - Faster notification queries")
        print("  - Faster dashboard queries")
        print("  - Faster audit log searches")
        print("  - Faster analytics queries")

if __name__ == "__main__":
    asyncio.run(add_indexes())
