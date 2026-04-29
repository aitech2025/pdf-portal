import os
import uuid
import aiofiles
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.database import get_db
from app.models.pdf import PDF, PDFVersion
from app.models.log import DownloadLog, AnalyticsEvent
from app.models.user import User
from app.auth import get_current_user, require_admin
from app.config import settings
from app.services.email import send_pdf_approval_email, send_pdf_rejection_email

router = APIRouter(prefix="/api/pdfs", tags=["pdfs"])

def _pdf_dict(p: PDF, expand: bool = False) -> dict:
    d = {
        "id": p.id, "fileName": p.file_name, "filePath": p.file_path,
        "fileSize": p.file_size, "categoryId": p.category_id,
        "subCategoryId": p.sub_category_id, "uploadedBy": p.uploaded_by,
        "isActive": p.is_active, "status": p.status,
        "rejectionReason": p.rejection_reason, "description": p.description,
        "tags": p.tags, "email": p.email, "pdfId": p.pdf_id,
        "currentVersion": p.current_version, "versionCount": p.version_count,
        "downloadCount": p.download_count, "viewCount": p.view_count,
        "created": p.created.isoformat() if p.created else None,
        "updated": p.updated.isoformat() if p.updated else None,
    }
    if expand and p.category:
        d["expand"] = {"categoryId": {"id": p.category.id, "categoryName": p.category.category_name}}
    return d

@router.get("")
async def list_pdfs(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    sort: str = Query("-created"),
    filter: str = Query(""),
    expand: str = Query(""),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy.orm import selectinload
    q = select(PDF)
    if expand:
        q = q.options(selectinload(PDF.category), selectinload(PDF.sub_category))
    if filter:
        q = q.where(PDF.file_name.ilike(f"%{filter}%"))

    desc = sort.startswith("-")
    field = sort.lstrip("+-")
    col_map = {"created": PDF.created, "fileName": PDF.file_name, "status": PDF.status}
    col = col_map.get(field, PDF.created)
    q = q.order_by(col.desc() if desc else col.asc())

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    q = q.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(q)
    pdfs = result.scalars().all()

    return {"items": [_pdf_dict(p, bool(expand)) for p in pdfs], "totalItems": total, "page": page, "perPage": per_page}

@router.get("/{pdf_id}")
async def get_pdf(pdf_id: str, request: Request, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(PDF).where(PDF.id == pdf_id))
    pdf = result.scalar_one_or_none()
    if not pdf:
        raise HTTPException(404, "PDF not found")

    # Track view
    event = AnalyticsEvent(
        user_id=current_user.id,
        event_type="pdf_view",
        event_data={"pdfId": pdf_id, "pdfName": pdf.file_name},
        session_id=request.headers.get("x-session-id"),
    )
    db.add(event)
    await db.commit()

    return _pdf_dict(pdf)

@router.post("")
async def upload_pdf(
    file: UploadFile = File(...),
    fileName: str = Form(...),
    categoryId: str = Form(None),
    subCategoryId: str = Form(None),
    description: str = Form(None),
    tags: str = Form(None),
    email: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename)[1]
    stored_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, stored_name)

    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    pdf = PDF(
        file_name=fileName,
        file_path=stored_name,
        file_size=len(content),
        category_id=categoryId,
        sub_category_id=subCategoryId,
        uploaded_by=current_user.id,
        description=description,
        tags=tags,
        email=email,
        status="approved",
        is_active=True,
    )
    db.add(pdf)
    await db.commit()
    await db.refresh(pdf)
    return _pdf_dict(pdf)

@router.patch("/{pdf_id}")
async def update_pdf(
    pdf_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(PDF).where(PDF.id == pdf_id))
    pdf = result.scalar_one_or_none()
    if not pdf:
        raise HTTPException(404, "PDF not found")

    prev_status = pdf.status

    field_map = {
        "isActive": "is_active", "status": "status", "rejectionReason": "rejection_reason",
        "description": "description", "tags": "tags", "categoryId": "category_id",
        "subCategoryId": "sub_category_id", "fileName": "file_name",
    }
    for k, v in field_map.items():
        if k in body:
            setattr(pdf, v, body[k])

    await db.commit()
    await db.refresh(pdf)

    # Trigger email on status change
    new_status = pdf.status
    if prev_status != new_status and pdf.email:
        if new_status == "approved":
            await send_pdf_approval_email(pdf.email, pdf.file_name)
        elif new_status == "rejected":
            await send_pdf_rejection_email(pdf.email, pdf.file_name, pdf.rejection_reason or "")

    return _pdf_dict(pdf)

@router.delete("/{pdf_id}")
async def delete_pdf(pdf_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(select(PDF).where(PDF.id == pdf_id))
    pdf = result.scalar_one_or_none()
    if not pdf:
        raise HTTPException(404, "PDF not found")
    # Remove file
    file_path = os.path.join(settings.UPLOAD_DIR, pdf.file_path)
    if os.path.exists(file_path):
        os.remove(file_path)
    await db.delete(pdf)
    await db.commit()
    return {"message": "Deleted"}

@router.get("/{pdf_id}/download")
async def download_pdf(
    pdf_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from fastapi.responses import FileResponse
    result = await db.execute(select(PDF).where(PDF.id == pdf_id))
    pdf = result.scalar_one_or_none()
    if not pdf:
        raise HTTPException(404, "PDF not found")

    file_path = os.path.join(settings.UPLOAD_DIR, pdf.file_path)
    if not os.path.exists(file_path):
        raise HTTPException(404, "File not found on disk")

    # Log download
    log = DownloadLog(
        school_id=current_user.school_id or "",
        user_id=current_user.id,
        pdf_id=pdf_id,
        category_id=pdf.category_id,
        sub_category_id=pdf.sub_category_id,
        download_type="single",
    )
    db.add(log)
    pdf.download_count = (pdf.download_count or 0) + 1
    await db.commit()

    return FileResponse(file_path, filename=pdf.file_name, media_type="application/pdf")
