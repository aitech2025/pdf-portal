import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.pdf import PDF, PDFVersion
from app.models.user import User
from app.auth import get_current_user
from app.routers.pdfs import SCHOOL_ROLES, _get_school_category_ids, _check_school_pdf_access, _resolve_upload_file
from app.services.pdf_storage import read_pdf_bytes, remove_disk_file

router = APIRouter(prefix="/api/pdfVersions", tags=["pdfVersions"])


def _version_dict(v: PDFVersion) -> dict:
    return {
        "id": v.id,
        "pdfId": v.pdf_id,
        "versionNumber": v.version_number,
        "filePath": v.file_path,
        "pdfFile": v.file_path,
        "fileSize": v.file_size,
        "uploadedBy": v.uploaded_by,
        "versionNotes": v.version_notes,
        "isCurrent": v.is_current,
        "uploadDate": v.upload_date.isoformat() if v.upload_date else None,
        "created": v.created.isoformat() if v.created else None,
    }


@router.get("")
async def list_versions(
    page: int = Query(1),
    per_page: int = Query(100),
    filter: str = Query(""),
    sort: str = Query("-versionNumber"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(PDFVersion)
    if 'pdfId = "' in filter:
        pdf_id = filter.split('pdfId = "')[1].split('"')[0]
        q = q.where(PDFVersion.pdf_id == pdf_id)
    if "isCurrent = true" in filter:
        q = q.where(PDFVersion.is_current.is_(True))

    if current_user.role in SCHOOL_ROLES:
        if not current_user.school_id:
            return {"items": [], "totalItems": 0, "totalPages": 0, "page": page, "perPage": per_page}
        allowed = await _get_school_category_ids(db, current_user.school_id)
        if not allowed:
            return {"items": [], "totalItems": 0, "totalPages": 0, "page": page, "perPage": per_page}
        q = q.join(PDF, PDF.id == PDFVersion.pdf_id).where(
            PDF.category_id.in_(allowed),
            PDF.status == "approved",
            PDF.is_active.is_(True),
        )

    desc = sort.startswith("-")
    field = sort.lstrip("+-")
    col = PDFVersion.version_number if field == "versionNumber" else PDFVersion.created
    q = q.order_by(col.desc() if desc else col.asc())

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    result = await db.execute(q.offset((page - 1) * per_page).limit(per_page))
    versions = result.scalars().all()
    return {
        "items": [_version_dict(v) for v in versions],
        "totalItems": total,
        "totalPages": (total + per_page - 1) // per_page,
        "page": page,
        "perPage": per_page,
    }


@router.get("/{version_id}/download")
async def download_version(
    version_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(PDFVersion).where(PDFVersion.id == version_id))
    version = result.scalar_one_or_none()
    if not version:
        raise HTTPException(404, "Version not found")
    parent_pdf = await db.get(PDF, version.pdf_id)
    if not parent_pdf:
        raise HTTPException(404, "Parent PDF not found")
    await _check_school_pdf_access(db, current_user, parent_pdf)

    content = read_pdf_bytes(version.file_data, version.file_path)
    if not content:
        raise HTTPException(404, "File not found")
    safe_name = f"{parent_pdf.file_name or 'document'}_v{version.version_number}.pdf".replace('"', "")
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'},
    )


@router.post("")
async def create_version(
    pdfFile: UploadFile | None = File(None),
    file: UploadFile | None = File(None),
    pdfId: str = Form(...),
    versionNumber: int = Form(...),
    uploadedBy: str = Form(...),
    fileSize: int | None = Form(None),
    versionNotes: str | None = Form(None),
    isCurrent: str = Form("true"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    parent_pdf = await db.get(PDF, pdfId)
    if not parent_pdf:
        raise HTTPException(404, "Parent PDF not found")
    await _check_school_pdf_access(db, current_user, parent_pdf)

    upload = _resolve_upload_file(file, pdfFile)
    content = await upload.read()
    if not content:
        raise HTTPException(400, "Uploaded file is empty")

    ext = os.path.splitext(upload.filename or "file.pdf")[1] or ".pdf"
    stored_name = f"{uuid.uuid4().hex}{ext}"
    is_current_bool = str(isCurrent).lower() in ("true", "1", "yes")

    if is_current_bool:
        prev = await db.execute(
            select(PDFVersion).where(PDFVersion.pdf_id == pdfId, PDFVersion.is_current.is_(True))
        )
        for v in prev.scalars().all():
            v.is_current = False

    version = PDFVersion(
        pdf_id=pdfId,
        version_number=versionNumber,
        file_path=stored_name,
        file_data=content,
        file_size=fileSize or len(content),
        uploaded_by=uploadedBy,
        version_notes=versionNotes,
        is_current=is_current_bool,
    )
    db.add(version)

    pdf = await db.get(PDF, pdfId)
    if pdf:
        pdf.current_version = versionNumber
        pdf.version_count = max(pdf.version_count or 1, versionNumber)
        if is_current_bool:
            pdf.file_path = stored_name
            pdf.file_data = content
            pdf.file_size = fileSize or len(content)
            if versionNotes:
                pdf.version_notes = versionNotes

    await db.commit()
    await db.refresh(version)
    return _version_dict(version)


@router.patch("/{version_id}")
async def update_version(
    version_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(PDFVersion).where(PDFVersion.id == version_id))
    version = result.scalar_one_or_none()
    if not version:
        raise HTTPException(404, "Version not found")
    parent_pdf = await db.get(PDF, version.pdf_id)
    if not parent_pdf:
        raise HTTPException(404, "Parent PDF not found")
    await _check_school_pdf_access(db, current_user, parent_pdf)

    if "isCurrent" in body:
        is_current = bool(body["isCurrent"])
        if is_current:
            prev = await db.execute(
                select(PDFVersion).where(
                    PDFVersion.pdf_id == version.pdf_id,
                    PDFVersion.is_current.is_(True),
                    PDFVersion.id != version_id,
                )
            )
            for v in prev.scalars().all():
                v.is_current = False
            version.is_current = True
            parent_pdf.current_version = version.version_number
            parent_pdf.file_path = version.file_path
            parent_pdf.file_data = version.file_data
            parent_pdf.file_size = version.file_size
        else:
            version.is_current = False

    if "versionNotes" in body:
        version.version_notes = body["versionNotes"]

    await db.commit()
    await db.refresh(version)
    return _version_dict(version)


@router.delete("/{version_id}")
async def delete_version(
    version_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(PDFVersion).where(PDFVersion.id == version_id))
    version = result.scalar_one_or_none()
    if not version:
        raise HTTPException(404, "Version not found")
    parent_pdf = await db.get(PDF, version.pdf_id)
    if not parent_pdf:
        raise HTTPException(404, "Parent PDF not found")
    await _check_school_pdf_access(db, current_user, parent_pdf)

    remove_disk_file(version.file_path)
    await db.delete(version)
    await db.commit()
    return {"message": "Deleted"}
