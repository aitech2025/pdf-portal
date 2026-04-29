from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.category import Category, SubCategory
from app.models.user import User
from app.auth import get_current_user, require_admin

router = APIRouter(prefix="/api", tags=["categories"])

def _cat_dict(c: Category) -> dict:
    return {
        "id": c.id, "categoryName": c.category_name, "categoryType": c.category_type,
        "description": c.description, "isActive": c.is_active, "icon": c.icon,
        "displayOrder": c.display_order,
        "created": c.created.isoformat() if c.created else None,
        "updated": c.updated.isoformat() if c.updated else None,
    }

def _subcat_dict(s: SubCategory) -> dict:
    return {
        "id": s.id, "subCategoryName": s.sub_category_name, "categoryId": s.category_id,
        "description": s.description, "isActive": s.is_active, "icon": s.icon,
        "displayOrder": s.display_order,
        "created": s.created.isoformat() if s.created else None,
        "updated": s.updated.isoformat() if s.updated else None,
    }

# Categories
@router.get("/categories")
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Category).order_by(Category.display_order))
    return {"items": [_cat_dict(c) for c in result.scalars().all()]}

@router.post("/categories")
async def create_category(body: dict, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    cat = Category(
        category_name=body["categoryName"],
        category_type=body["categoryType"],
        description=body.get("description"),
        is_active=body.get("isActive", True),
        icon=body.get("icon"),
        display_order=body.get("displayOrder", 0),
    )
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return _cat_dict(cat)

@router.patch("/categories/{cat_id}")
async def update_category(cat_id: str, body: dict, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(select(Category).where(Category.id == cat_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(404, "Not found")
    for k, v in {"categoryName": "category_name", "categoryType": "category_type",
                 "description": "description", "isActive": "is_active",
                 "icon": "icon", "displayOrder": "display_order"}.items():
        if k in body:
            setattr(cat, v, body[k])
    await db.commit()
    await db.refresh(cat)
    return _cat_dict(cat)

@router.delete("/categories/{cat_id}")
async def delete_category(cat_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(select(Category).where(Category.id == cat_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(404, "Not found")
    await db.delete(cat)
    await db.commit()
    return {"message": "Deleted"}

# SubCategories
@router.get("/subCategories")
async def list_subcategories(category_id: str = Query(None), db: AsyncSession = Depends(get_db)):
    q = select(SubCategory).order_by(SubCategory.display_order)
    if category_id:
        q = q.where(SubCategory.category_id == category_id)
    result = await db.execute(q)
    return {"items": [_subcat_dict(s) for s in result.scalars().all()]}

@router.post("/subCategories")
async def create_subcategory(body: dict, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    sub = SubCategory(
        sub_category_name=body["subCategoryName"],
        category_id=body["categoryId"],
        description=body.get("description"),
        is_active=body.get("isActive", True),
        icon=body.get("icon"),
        display_order=body.get("displayOrder", 0),
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return _subcat_dict(sub)

@router.patch("/subCategories/{sub_id}")
async def update_subcategory(sub_id: str, body: dict, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(select(SubCategory).where(SubCategory.id == sub_id))
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(404, "Not found")
    for k, v in {"subCategoryName": "sub_category_name", "categoryId": "category_id",
                 "description": "description", "isActive": "is_active",
                 "icon": "icon", "displayOrder": "display_order"}.items():
        if k in body:
            setattr(sub, v, body[k])
    await db.commit()
    await db.refresh(sub)
    return _subcat_dict(sub)

@router.delete("/subCategories/{sub_id}")
async def delete_subcategory(sub_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(select(SubCategory).where(SubCategory.id == sub_id))
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(404, "Not found")
    await db.delete(sub)
    await db.commit()
    return {"message": "Deleted"}
