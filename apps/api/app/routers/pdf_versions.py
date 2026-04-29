import os
import uuid
import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.pdf import PDF, PDFVersion
from app.models.user import User
from app.auth import get_current_user
from app.config import settings

router = APIRouter(prefix="/api/pdfVersions", tags=["pdfVersions"])

def _version_dict(v: PDFVersion) -> dict:
    return {
        "id": v.id, "pdfId": v.pdf_id, "versionNumber": v.version_number,
        "filePath": v.file_path, "fileSize": v.file_size,
        "uploadedBy": v.uploaded_by, "versionNotes": v.version_notes,
        "isCurrent": v.is_current,
        "uploadDate": v.upload_date.isoformat() if v.upload_date else None,
        "created": v.created.isoformat() if v.created else None,
    }

@router.get("")
async def list_versions(
    page: int = Query(1), per_page: int = Query(100),
    filter: str = Query(""),
    sort: str = Query("-versionNumber"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(PDFVersion)
    # Simple filter: pdfId = "xxx"
    if 'pdfId = "' in filter:
        pdf_id = filter.split('pdfId = "')[1].split('"')[0]
        q = q.where(PDFVersion.pdf_id == pdf_id)
    if 'isCurrent = true' in filter:
        q = q.where(PDFVersion.is_current == True)

    desc = sort.startswith("-")
    field = sort.lstrip("+-")
    col = PDFVersion.version_number if field == "versionNumber" else PDFVersion.created
    q = q.order_by(col.desc() if desc else col.asc())

    from sqlalchemy import func
    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    result = await db.execute(q.offset((page - 1) * per_page).limit(per_page))
    versions = result.scalars().all()
    return {"items": [_version_dict(v) for v in versions], "totalItems": total}

@router.post("")
async def create_version(
    pdfFile: UploadFile = File(...),
    pdfId: str = Form(...),
    versionNumber: int = Form(...),
    uploadedBy: str = Form(...),
    fileSize: int = Form(None),
    versionNotes: str = Form(None),
    isCurrent: str = Form("true"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(pdfFile.filename or "file.pdf")[1] or ".pdf"
    stored_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, stored_name)

    content = await pdfFile.read()
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    is_current_bool = str(isCurrent).lower() in ("true", "1", "yes")

    # Mark previous versions as not current
    if is_current_bool:
        prev = await db.execute(select(PDFVersion).where(
            PDFVersion.pdf_id == pdfId, PDFVersion.is_current == True
        ))
        for v in prev.scalars().all():
            v.is_current = False

    version = PDFVersion(
        pdf_id=pdfId,
        version_number=versionNumber,
        file_path=stored_name,
        file_size=fileSize or len(content),
        uploaded_by=uploadedBy,
        version_notes=versionNotes,
        is_current=is_current_bool,
    )
    db.add(version)

    # Update parent PDF
    pdf = await db.get(PDF, pdfId)
    if pdf:
        pdf.current_version = versionNumber
        pdf.version_count = (pdf.version_count or 0) + 1
        if is_current_bool:
            pdf.file_path = stored_name
            pdf.file_size = fileSize or len(content)

    await db.commit()
    await db.refresh(version)
    return _version_dict(version)

@router.patch("/{version_id}")
async def update_version(
    version_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(PDFVersion).where(PDFVersion.id == version_id))
    version = result.scalar_one_or_none()
    if not version:
        raise HTTPException(404, "Version not found")
    if "isCurrent" in body:
        version.is_current = body["isCurrent"]
    if "versionNotes" in body:
        version.version_notes = body["versionNotes"]
    await db.commit()
    await db.refresh(version)
    return _version_dict(version)

@router.delete("/{version_id}")
async def delete_version(
    version_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(PDFVersion).where(PDFVersion.id == version_id))
    version = result.scalar_one_or_none()
    if not version:
        raise HTTPException(404, "Version not found")
    file_path = os.path.join(settings.UPLOAD_DIR, version.file_path)
    if os.path.exists(file_path):
        os.remove(file_path)
    await db.delete(version)
    await db.commit()
    return {"message": "Deleted"}
