"""Read/write PDF bytes — database first, filesystem fallback for legacy rows."""
import os
from app.config import settings


def disk_path(stored_name: str) -> str:
    return os.path.join(settings.UPLOAD_DIR, stored_name)


def read_pdf_bytes(file_data: bytes | None, file_path: str | None) -> bytes | None:
    if file_data:
        return file_data
    if file_path:
        path = disk_path(file_path)
        if os.path.exists(path):
            with open(path, "rb") as f:
                return f.read()
    return None


def remove_disk_file(file_path: str | None) -> None:
    if not file_path:
        return
    path = disk_path(file_path)
    if os.path.exists(path):
        os.remove(path)
