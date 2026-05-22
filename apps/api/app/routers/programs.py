from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_admin
from app.database import get_db
from app.models.program import Program
from app.models.user import User

router = APIRouter(prefix="/api/programs", tags=["programs"])


def _normalize_slug(text: str) -> str:
    return "-".join(text.lower().strip().split())


def _program_dict(p: Program) -> dict:
    return {
        "id": p.id,
        "programCode": p.program_code,
        "programName": p.program_name,
        "slug": p.slug,
        "description": p.description,
        "icon": p.icon,
        "status": p.status,
        "displayOrder": p.display_order,
        "isArchived": p.is_archived,
        "created": p.created.isoformat() if p.created else None,
        "updated": p.updated.isoformat() if p.updated else None,
    }


@router.get("")
async def list_programs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Program).order_by(Program.display_order, Program.program_name))
    return {"items": [_program_dict(program) for program in result.scalars().all()]}


@router.post("")
async def create_program(body: dict, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    code = str(body.get("programCode", "")).strip().upper()
    name = str(body.get("programName", "")).strip()
    slug = str(body.get("slug") or _normalize_slug(name)).strip().lower()

    if not code or not name:
        raise HTTPException(400, "programCode and programName are required")

    existing = await db.execute(
        select(Program).where((Program.program_code == code) | (Program.program_name == name) | (Program.slug == slug))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Program code, name or slug already exists")

    program = Program(
        program_code=code,
        program_name=name,
        slug=slug,
        description=body.get("description"),
        icon=body.get("icon"),
        status=body.get("status", "active"),
        display_order=body.get("displayOrder", 0),
        is_archived=body.get("isArchived", False),
    )
    db.add(program)
    await db.commit()
    await db.refresh(program)
    return _program_dict(program)


@router.patch("/{program_id}")
async def update_program(
    program_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Program).where(Program.id == program_id))
    program = result.scalar_one_or_none()
    if not program:
        raise HTTPException(404, "Program not found")

    if "programCode" in body:
        program.program_code = str(body["programCode"]).strip().upper()
    if "programName" in body:
        program.program_name = str(body["programName"]).strip()
    if "slug" in body:
        program.slug = str(body["slug"]).strip().lower()
    if "description" in body:
        program.description = body["description"]
    if "icon" in body:
        program.icon = body["icon"]
    if "status" in body:
        program.status = body["status"]
    if "displayOrder" in body:
        program.display_order = body["displayOrder"]
    if "isArchived" in body:
        program.is_archived = bool(body["isArchived"])

    await db.commit()
    await db.refresh(program)
    return _program_dict(program)


@router.delete("/{program_id}")
async def delete_program(program_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(select(Program).where(Program.id == program_id))
    program = result.scalar_one_or_none()
    if not program:
        raise HTTPException(404, "Program not found")
    await db.delete(program)
    await db.commit()
    return {"message": "Deleted"}
