"""PDF upload, preview, and download with database storage."""
import pytest
from sqlalchemy import select
from app.models.pdf import PDF
from tests.conftest import TestingSessionLocal, create_user, make_token


@pytest.mark.asyncio
async def test_pdf_upload_preview_download(client):
    async with TestingSessionLocal() as db:
        admin = await create_user(db, "pdf_admin@test.com", role="platform_admin")

    token = make_token(admin)
    headers = {"Authorization": f"Bearer {token}"}

    pdf_bytes = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"
    files = {"file": ("test-doc.pdf", pdf_bytes, "application/pdf")}
    data = {
        "fileName": "test-doc.pdf",
        "status": "approved",
        "isActive": "true",
    }

    upload_res = await client.post("/api/pdfs", files=files, data=data, headers=headers)
    assert upload_res.status_code == 200, upload_res.text
    pdf_id = upload_res.json()["id"]

    async with TestingSessionLocal() as db:
        row = await db.scalar(select(PDF).where(PDF.id == pdf_id))
        assert row is not None
        assert row.file_data == pdf_bytes

    preview_res = await client.get(f"/api/pdfs/{pdf_id}/preview", headers=headers)
    assert preview_res.status_code == 200
    assert "application/pdf" in preview_res.headers["content-type"]
    assert preview_res.content == pdf_bytes

    download_res = await client.get(f"/api/pdfs/{pdf_id}/download", headers=headers)
    assert download_res.status_code == 200
    assert download_res.content == pdf_bytes

    delete_res = await client.delete(f"/api/pdfs/{pdf_id}", headers=headers)
    assert delete_res.status_code == 200
