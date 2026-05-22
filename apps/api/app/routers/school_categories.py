from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.school import School, SchoolCategoryAccess
from app.models.category import Category
from app.models.user import User
from app.auth import get_current_user, require_admin

router = APIRouter(prefix="/api/schools", tags=["school-categories"])


def _access_dict(access: SchoolCategoryAccess, category: Category) -> dict:
    return {
        "id": access.id,
        "categoryId": category.id,
        "categoryName": category.category_name,
        "categoryType": category.category_type,
        "isActive": category.is_active,
    }


@router.get("/{school_id}/categories")
async def list_school_categories(
    school_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    school_roles = {"school", "school_admin", "school_viewer", "teacher"}
    admin_roles = {"admin", "platform_admin"}

    if current_user.role in school_roles and current_user.school_id != school_id:
        raise HTTPException(403, "Insufficient permissions")
    if current_user.role not in school_roles and current_user.role not in admin_roles:
        raise HTTPException(403, "Insufficient permissions")

    # Verify school exists
    school = await db.scalar(select(School).where(School.id == school_id))
    if not school:
        raise HTTPException(404, "School not found")

    result = await db.execute(
        select(SchoolCategoryAccess, Category)
        .join(Category, SchoolCategoryAccess.category_id == Category.id)
        .where(SchoolCategoryAccess.school_id == school_id)
        .order_by(Category.display_order)
    )
    rows = result.all()

    return {"items": [_access_dict(access, category) for access, category in rows]}


@router.post("/{school_id}/categories")
async def assign_school_categories(
    school_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    # Verify school exists
    school = await db.scalar(select(School).where(School.id == school_id))
    if not school:
        raise HTTPException(404, "School not found")

    category_ids: list[str] = body.get("categoryIds", [])

    created = []
    for cat_id in category_ids:
        # Verify category exists
        category = await db.scalar(select(Category).where(Category.id == cat_id))
        if not category:
            raise HTTPException(404, f"Category not found: {cat_id}")

        # Check for duplicate assignment
        existing = await db.scalar(
            select(SchoolCategoryAccess).where(
                SchoolCategoryAccess.school_id == school_id,
                SchoolCategoryAccess.category_id == cat_id,
            )
        )
        if existing:
            raise HTTPException(409, "Category already assigned to this school")

        access = SchoolCategoryAccess(school_id=school_id, category_id=cat_id)
        db.add(access)
        created.append((access, category))

    await db.commit()

    # Refresh to get generated IDs
    items = []
    for access, category in created:
        await db.refresh(access)
        items.append(_access_dict(access, category))

    return {"items": items}


@router.delete("/{school_id}/categories/{category_id}")
async def remove_school_category(
    school_id: str,
    category_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    access = await db.scalar(
        select(SchoolCategoryAccess).where(
            SchoolCategoryAccess.school_id == school_id,
            SchoolCategoryAccess.category_id == category_id,
        )
    )
    if not access:
        raise HTTPException(404, "School not found")

    await db.delete(access)
    await db.commit()
    return {"message": "Deleted"}
