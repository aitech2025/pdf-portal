import os

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, Request

from fastapi.responses import Response

from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select, func

from sqlalchemy.orm import selectinload

from app.database import get_db

from app.models.pdf import PDF, PDFVersion

from app.models.log import DownloadLog, AnalyticsEvent

from app.models.user import User

from app.auth import get_current_user, require_admin

from app.config import settings

from app.services.email import send_pdf_approval_email, send_pdf_rejection_email

from app.services.pdf_storage import read_pdf_bytes, remove_disk_file



router = APIRouter(prefix="/api/pdfs", tags=["pdfs"])



SCHOOL_ROLES = {"school", "school_admin", "school_viewer", "teacher"}





async def _get_school_category_ids(db: AsyncSession, school_id: str) -> list[str]:

    from app.models.school import SchoolCategoryAccess

    result = await db.execute(

        select(SchoolCategoryAccess.category_id).where(

            SchoolCategoryAccess.school_id == school_id

        )

    )

    return [row[0] for row in result.all()]





async def _check_school_pdf_access(db: AsyncSession, user: User, pdf: PDF) -> None:

    if user.role not in SCHOOL_ROLES:

        return

    if not user.school_id:

        raise HTTPException(403, "Access denied")

    allowed = await _get_school_category_ids(db, user.school_id)

    if pdf.category_id not in allowed:

        raise HTTPException(403, "Access denied")

    if pdf.status != "approved" or not pdf.is_active:

        raise HTTPException(403, "Access denied")





def _pdf_dict(p: PDF, expand: bool = False) -> dict:

    d = {

        "id": p.id,

        "fileName": p.file_name,

        "filePath": p.file_path,

        "pdfFile": p.file_path,

        "fileSize": p.file_size,

        "hasFile": bool(p.file_data) or bool(p.file_path),

        "categoryId": p.category_id,

        "subCategoryId": p.sub_category_id,

        "uploadedBy": p.uploaded_by,

        "isActive": p.is_active,

        "status": p.status,

        "rejectionReason": p.rejection_reason,

        "description": p.description,

        "tags": p.tags,

        "email": p.email,

        "pdfId": p.pdf_id,

        "pdf_id": p.pdf_id,

        "currentVersion": p.current_version,

        "versionCount": p.version_count,

        "versionNotes": p.version_notes,

        "downloadCount": p.download_count,

        "viewCount": p.view_count,

        "created": p.created.isoformat() if p.created else None,

        "updated": p.updated.isoformat() if p.updated else None,

    }

    if expand and p.category:

        d["expand"] = {

            "categoryId": {"id": p.category.id, "categoryName": p.category.category_name},

            "subCategoryId": (

                {"id": p.sub_category.id, "subCategoryName": p.sub_category.sub_category_name}

                if p.sub_category

                else None

            ),

        }

    return d





def _pdf_response(pdf: PDF, inline: bool) -> Response:

    content = read_pdf_bytes(pdf.file_data, pdf.file_path)

    if not content:

        raise HTTPException(404, "File not found")

    disposition = "inline" if inline else "attachment"

    safe_name = (pdf.file_name or "document.pdf").replace('"', "")

    return Response(

        content=content,

        media_type="application/pdf",

        headers={"Content-Disposition": f'{disposition}; filename="{safe_name}"'},

    )





def _resolve_upload_file(file: UploadFile | None, pdf_file: UploadFile | None) -> UploadFile:

    upload = file or pdf_file

    if not upload or not upload.filename:

        raise HTTPException(400, "PDF file is required (field: file or pdfFile)")

    return upload





@router.get("")

async def list_pdfs(

    page: int = Query(1, ge=1),

    per_page: int = Query(10, ge=1, le=100),

    sort: str = Query("-created"),

    filter: str = Query(""),

    expand: str = Query(""),

    subCategoryId: str | None = Query(None),

    db: AsyncSession = Depends(get_db),

    current_user: User = Depends(get_current_user),

):

    q = select(PDF)

    if expand:

        q = q.options(selectinload(PDF.category), selectinload(PDF.sub_category))

    if filter:

        q = q.where(PDF.file_name.ilike(f"%{filter}%"))

    if subCategoryId:

        q = q.where(PDF.sub_category_id == subCategoryId)



    if current_user.role in SCHOOL_ROLES:

        if not current_user.school_id:

            return {"items": [], "totalItems": 0, "totalPages": 0, "page": page, "perPage": per_page}

        allowed = await _get_school_category_ids(db, current_user.school_id)

        if not allowed:

            return {"items": [], "totalItems": 0, "totalPages": 0, "page": page, "perPage": per_page}

        q = q.where(PDF.category_id.in_(allowed))

        q = q.where(PDF.status == "approved", PDF.is_active.is_(True))



    desc = sort.startswith("-")

    field = sort.lstrip("+-")

    col_map = {"created": PDF.created, "fileName": PDF.file_name, "status": PDF.status}

    col = col_map.get(field, PDF.created)

    q = q.order_by(col.desc() if desc else col.asc())



    total = await db.scalar(select(func.count()).select_from(q.subquery()))

    result = await db.execute(q.offset((page - 1) * per_page).limit(per_page))

    pdfs = result.scalars().all()



    return {

        "items": [_pdf_dict(p, bool(expand)) for p in pdfs],

        "totalItems": total,

        "totalPages": (total + per_page - 1) // per_page,

        "page": page,

        "perPage": per_page,

    }





@router.get("/{pdf_id}")

async def get_pdf(

    pdf_id: str,

    request: Request,

    db: AsyncSession = Depends(get_db),

    current_user: User = Depends(get_current_user),

):

    result = await db.execute(select(PDF).where(PDF.id == pdf_id))

    pdf = result.scalar_one_or_none()

    if not pdf:

        raise HTTPException(404, "PDF not found")



    await _check_school_pdf_access(db, current_user, pdf)



    event = AnalyticsEvent(

        user_id=current_user.id,

        event_type="pdf_view",

        event_data={"pdfId": pdf_id, "pdfName": pdf.file_name},

        session_id=request.headers.get("x-session-id"),

    )

    db.add(event)

    pdf.view_count = (pdf.view_count or 0) + 1

    await db.commit()



    return _pdf_dict(pdf)





@router.get("/{pdf_id}/preview")

async def preview_pdf(

    pdf_id: str,

    db: AsyncSession = Depends(get_db),

    current_user: User = Depends(get_current_user),

):

    result = await db.execute(select(PDF).where(PDF.id == pdf_id))

    pdf = result.scalar_one_or_none()

    if not pdf:

        raise HTTPException(404, "PDF not found")

    await _check_school_pdf_access(db, current_user, pdf)

    return _pdf_response(pdf, inline=True)





@router.get("/{pdf_id}/download")

async def download_pdf(

    pdf_id: str,

    db: AsyncSession = Depends(get_db),

    current_user: User = Depends(get_current_user),

):

    result = await db.execute(select(PDF).where(PDF.id == pdf_id))

    pdf = result.scalar_one_or_none()

    if not pdf:

        raise HTTPException(404, "PDF not found")



    await _check_school_pdf_access(db, current_user, pdf)



    # DownloadLog.school_id is a non-null FK. Platform users may not belong to a school,
    # so only create a log row when the current user has a valid school_id.
    if current_user.school_id:
        log = DownloadLog(
            school_id=current_user.school_id,
            user_id=current_user.id,
            pdf_id=pdf_id,
            category_id=pdf.category_id,
            sub_category_id=pdf.sub_category_id,
            download_type="single",
        )
        db.add(log)

    pdf.download_count = (pdf.download_count or 0) + 1

    await db.commit()



    return _pdf_response(pdf, inline=False)





@router.post("")

async def upload_pdf(

    file: UploadFile | None = File(None),

    pdfFile: UploadFile | None = File(None),

    fileName: str = Form(...),

    categoryId: str | None = Form(None),

    subCategoryId: str | None = Form(None),

    description: str | None = Form(None),

    tags: str | None = Form(None),

    email: str | None = Form(None),

    pdf_id: str | None = Form(None),

    pdfId: str | None = Form(None),

    status: str | None = Form("approved"),

    isActive: str | None = Form("true"),

    versionNotes: str | None = Form(None),

    db: AsyncSession = Depends(get_db),

    current_user: User = Depends(get_current_user),

):

    upload = _resolve_upload_file(file, pdfFile)

    content = await upload.read()

    if not content:

        raise HTTPException(400, "Uploaded file is empty")

    if len(content) > 50 * 1024 * 1024:

        raise HTTPException(400, "File exceeds 50MB limit")



    ext = os.path.splitext(upload.filename or fileName)[1] or ".pdf"

    stored_name = f"{uuid.uuid4().hex}{ext}"

    is_active = str(isActive).lower() in ("true", "1", "yes")



    pdf = PDF(

        file_name=fileName,

        file_path=stored_name,

        file_data=content,

        file_size=len(content),

        category_id=categoryId,

        sub_category_id=subCategoryId,

        uploaded_by=current_user.id,

        description=description,

        tags=tags,

        email=email,

        pdf_id=pdf_id or pdfId,

        status=status or "approved",

        is_active=is_active,

        version_notes=versionNotes,

        current_version=1,

        version_count=1,

    )

    db.add(pdf)

    await db.flush()



    version = PDFVersion(

        pdf_id=pdf.id,

        version_number=1,

        file_path=stored_name,

        file_data=content,

        file_size=len(content),

        uploaded_by=current_user.id,

        version_notes=versionNotes or "Initial upload",

        is_current=True,

    )

    db.add(version)

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

        "isActive": "is_active",

        "status": "status",

        "rejectionReason": "rejection_reason",

        "description": "description",

        "tags": "tags",

        "categoryId": "category_id",

        "subCategoryId": "sub_category_id",

        "fileName": "file_name",

        "versionNotes": "version_notes",

        "currentVersion": "current_version",

        "pdfId": "pdf_id",

        "pdf_id": "pdf_id",

    }

    for k, v in field_map.items():

        if k in body:

            setattr(pdf, v, body[k])



    await db.commit()

    await db.refresh(pdf)



    new_status = pdf.status

    if prev_status != new_status and pdf.email:

        if new_status == "approved":

            await send_pdf_approval_email(pdf.email, pdf.file_name)

        elif new_status == "rejected":

            await send_pdf_rejection_email(pdf.email, pdf.file_name, pdf.rejection_reason or "")



    return _pdf_dict(pdf)





@router.delete("/{pdf_id}")

async def delete_pdf(pdf_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    from app.models.engagement import Favorite, PDFRating, Comment

    result = await db.execute(select(PDF).where(PDF.id == pdf_id))

    pdf = result.scalar_one_or_none()

    if not pdf:

        raise HTTPException(404, "PDF not found")

    for model, field in [
        (DownloadLog, DownloadLog.pdf_id),
        (Favorite, Favorite.pdf_id),
        (PDFRating, PDFRating.pdf_id),
        (Comment, Comment.pdf_id),
    ]:
        rows = await db.execute(select(model).where(field == pdf_id))
        for row in rows.scalars().all():
            await db.delete(row)

    versions = await db.execute(select(PDFVersion).where(PDFVersion.pdf_id == pdf_id))

    for version in versions.scalars().all():

        remove_disk_file(version.file_path)

        await db.delete(version)

    remove_disk_file(pdf.file_path)

    await db.delete(pdf)

    await db.commit()

    return {"message": "Deleted"}


