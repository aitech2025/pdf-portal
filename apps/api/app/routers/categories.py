from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.category import Category, SubCategory
from app.models.program import Program
from app.models.pdf import PDF
from app.models.user import User
from app.auth import get_current_user, require_admin

router = APIRouter(prefix="/api", tags=["categories"])

def _cat_dict(c: Category) -> dict:
    return {
        "id": c.id,
        "programId": c.program_id,
        "categoryCode": c.category_code,
        "categoryName": c.category_name,
        "slug": c.slug,
        "categoryType": c.category_type,
        "description": c.description, "isActive": c.is_active, "icon": c.icon,
        "status": c.status,
        "isArchived": c.is_archived,
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


def _slugify(value: str) -> str:
    return "-".join(value.lower().strip().split())


async def _generate_category_code(
    db: AsyncSession,
    program_code: str,
    category_name: str,
) -> str:
    segment = "".join(ch for ch in category_name.upper() if ch.isalnum())[:4] or "GEN"
    prefix = f"{program_code}-{segment}"
    existing = await db.execute(
        select(Category.category_code).where(
            Category.category_code.is_not(None),
            Category.category_code.like(f"{prefix}-%"),
        )
    )
    max_seq = 0
    for row in existing.all():
        code = row[0] or ""
        parts = code.split("-")
        if len(parts) >= 3 and parts[-1].isdigit():
            max_seq = max(max_seq, int(parts[-1]))
    return f"{prefix}-{max_seq + 1:03d}"

# Categories
@router.get("/categories")
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Category).order_by(Category.display_order))
    return {"items": [_cat_dict(c) for c in result.scalars().all()]}

@router.post("/categories")
async def create_category(body: dict, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    program_id = body.get("programId")
    category_name = body["categoryName"]
    slug = body.get("slug") or _slugify(category_name)

    program = None
    if program_id:
        program = await db.scalar(select(Program).where(Program.id == program_id))
        if not program:
            raise HTTPException(404, "Program not found")

    category_code = body.get("categoryCode")
    if not category_code and program:
        category_code = await _generate_category_code(db, program.program_code, category_name)

    cat = Category(
        program_id=program_id,
        category_code=category_code,
        category_name=category_name,
        slug=slug,
        category_type=body["categoryType"],
        description=body.get("description"),
        status=body.get("status", "active"),
        is_archived=body.get("isArchived", False),
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
    if "programId" in body:
        program = await db.scalar(select(Program).where(Program.id == body["programId"]))
        if not program:
            raise HTTPException(404, "Program not found")
        cat.program_id = program.id
    for k, v in {"categoryName": "category_name", "slug": "slug", "categoryType": "category_type",
                 "description": "description", "isActive": "is_active",
                 "status": "status", "isArchived": "is_archived",
                 "icon": "icon", "displayOrder": "display_order"}.items():
        if k in body:
            setattr(cat, v, body[k])
    await db.commit()
    await db.refresh(cat)
    return _cat_dict(cat)

@router.delete("/categories/{cat_id}")
async def delete_category(
    cat_id: str,
    force: bool = Query(False),
    archive: bool = Query(False),
    reassignTo: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Category).where(Category.id == cat_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(404, "Not found")

    pdf_count = await db.scalar(select(func.count()).select_from(PDF).where(PDF.category_id == cat_id))
    if pdf_count and pdf_count > 0:
        if reassignTo:
            replacement = await db.scalar(select(Category).where(Category.id == reassignTo))
            if not replacement:
                raise HTTPException(404, "Replacement category not found")
            if replacement.id == cat_id:
                raise HTTPException(400, "Cannot reassign to same category")
            pdfs = await db.execute(select(PDF).where(PDF.category_id == cat_id))
            for pdf in pdfs.scalars().all():
                pdf.category_id = replacement.id
        elif archive:
            cat.is_archived = True
            cat.status = "archived"
            cat.is_active = False
            await db.commit()
            await db.refresh(cat)
            return {"message": "Category archived", "item": _cat_dict(cat)}
        elif not force:
            raise HTTPException(
                409,
                "Category has PDFs. Reassign, archive, or use force delete.",
            )

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
