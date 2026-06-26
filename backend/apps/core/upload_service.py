import hashlib
import logging
import os
from datetime import timedelta
from uuid import UUID
from uuid import uuid4

from django.conf import settings
from django.utils import timezone

from .models import UploadSession, StoredFile
from .storage.onedrive.client import OneDriveClient, OneDriveError

logger = logging.getLogger(__name__)


ALLOWED_EXTENSIONS = {ext.lower() for ext in settings.UPLOAD_ALLOWED_EXTENSIONS}


def sanitize_filename(name: str) -> str:
    base = os.path.basename(name or "").strip().replace(" ", "_")
    allowed = "".join(c for c in base if c.isalnum() or c in ("-", "_", ".", "(", ")"))
    return allowed or f"arquivo_{uuid4().hex[:8]}"


def get_storage_provider():
    requested = (getattr(settings, "STORAGE_PROVIDER", "onedrive") or "onedrive").strip().lower()
    if requested == UploadSession.StorageProvider.LOCAL:
        return UploadSession.StorageProvider.LOCAL

    required = [
        getattr(settings, "ONEDRIVE_TENANT_ID", ""),
        getattr(settings, "ONEDRIVE_CLIENT_ID", ""),
        getattr(settings, "ONEDRIVE_CLIENT_SECRET", ""),
        getattr(settings, "ONEDRIVE_DRIVE_ID", ""),
    ]
    if all(required):
        return UploadSession.StorageProvider.ONEDRIVE

    logger.warning("OneDrive indisponivel por credenciais ausentes. Aplicando fallback local.")
    return UploadSession.StorageProvider.LOCAL


def get_local_tmp_file_path(upload_id):
    tmp_dir = settings.LOCAL_UPLOAD_TMP_DIR
    os.makedirs(tmp_dir, exist_ok=True)
    return os.path.join(tmp_dir, f"{upload_id}.part")


def append_local_chunk(upload: UploadSession, chunk_bytes: bytes):
    tmp_path = get_local_tmp_file_path(upload.id)
    with open(tmp_path, "ab") as f:
        f.write(chunk_bytes)


def cleanup_orphan_local_parts():
    tmp_dir = settings.LOCAL_UPLOAD_TMP_DIR
    if not os.path.exists(tmp_dir):
        return {"deleted": 0, "kept": 0}

    now = timezone.now()
    ttl_hours = max(1, int(getattr(settings, "LOCAL_UPLOAD_PART_TTL_HOURS", 24)))
    cutoff = now - timedelta(hours=ttl_hours)

    deleted = 0
    kept = 0
    for name in os.listdir(tmp_dir):
        if not name.endswith(".part"):
            continue

        full_path = os.path.join(tmp_dir, name)
        if not os.path.isfile(full_path):
            continue

        stat = os.stat(full_path)
        file_mtime = timezone.datetime.fromtimestamp(stat.st_mtime, tz=timezone.get_current_timezone())

        upload_id_raw = name[:-5]
        upload = None
        try:
            UUID(upload_id_raw)
            upload = UploadSession.objects.filter(id=upload_id_raw).first()
        except Exception:
            upload = None

        should_delete = False
        if upload is None:
            should_delete = file_mtime <= cutoff
        elif upload.status in (UploadSession.Status.COMPLETED, UploadSession.Status.FAILED, UploadSession.Status.CANCELED):
            should_delete = True
        elif upload.updated_at and upload.updated_at <= cutoff:
            should_delete = True
            upload.status = UploadSession.Status.FAILED
            upload.last_error = "Upload local expirado durante limpeza automatica."
            upload.save(update_fields=["status", "last_error", "updated_at"])

        if should_delete:
            try:
                os.remove(full_path)
                deleted += 1
            except OSError:
                kept += 1
        else:
            kept += 1

    return {"deleted": deleted, "kept": kept}


def finalize_local_upload(upload: UploadSession):
    tmp_path = get_local_tmp_file_path(upload.id)
    if not os.path.exists(tmp_path):
        raise FileNotFoundError("Arquivo temporario do upload nao encontrado.")
    if os.path.getsize(tmp_path) != upload.file_size:
        raise ValueError("Tamanho final do upload local diverge do esperado.")

    now = timezone.now()
    relative_dir = os.path.join(
        settings.LOCAL_UPLOAD_BASE_PATH.strip("/\\"),
        now.strftime("%Y"),
        now.strftime("%m"),
    )
    absolute_dir = os.path.join(settings.MEDIA_ROOT, relative_dir)
    os.makedirs(absolute_dir, exist_ok=True)

    final_name = f"{uuid4().hex}_{upload.file_name}"
    final_absolute_path = os.path.join(absolute_dir, final_name)
    final_relative_path = os.path.join(relative_dir, final_name).replace("\\", "/")

    sha256 = hashlib.sha256()
    md5 = hashlib.md5()
    with open(tmp_path, "rb") as src, open(final_absolute_path, "wb") as dst:
        while True:
            chunk = src.read(1024 * 1024)
            if not chunk:
                break
            sha256.update(chunk)
            md5.update(chunk)
            dst.write(chunk)
    os.remove(tmp_path)

    upload.sha256 = sha256.hexdigest()
    upload.md5 = md5.hexdigest()
    upload.onedrive_item_id = final_relative_path
    upload.completed_at = timezone.now()
    upload.status = UploadSession.Status.COMPLETED
    upload.save(update_fields=["sha256", "md5", "onedrive_item_id", "completed_at", "status", "updated_at"])

    return {
        "relative_path": final_relative_path,
        "sha256": upload.sha256,
        "md5": upload.md5,
    }


def validate_upload_constraints(file_name: str, file_size: int):
    ext = os.path.splitext(file_name)[1].lower()
    max_size_bytes = settings.UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Extensao nao permitida: {ext}")
    if file_size > max_size_bytes:
        raise ValueError(f"Arquivo excede limite de {settings.UPLOAD_MAX_FILE_SIZE_MB}MB")
    if file_size <= 0:
        raise ValueError("Arquivo vazio nao e permitido")


def compute_hashes_from_streaming_response(streaming_response):
    sha256 = hashlib.sha256()
    md5 = hashlib.md5()
    for chunk in streaming_response.iter_content(chunk_size=1024 * 1024):
        if not chunk:
            continue
        sha256.update(chunk)
        md5.update(chunk)
    return sha256.hexdigest(), md5.hexdigest()


def create_upload_session_for_user(*, user, file_name, file_size, content_type="", relative_path=""):
    clean_name = sanitize_filename(file_name)
    validate_upload_constraints(clean_name, int(file_size))

    provider = get_storage_provider()
    session_upload_url = ""
    expiration = timezone.now() + timedelta(hours=24)
    if provider == UploadSession.StorageProvider.ONEDRIVE:
        client = OneDriveClient()
        session = client.create_upload_session(relative_path=relative_path, file_name=clean_name)
        session_upload_url = session["upload_url"]
        expiration = client.parse_expiration(session.get("expiration_date_time"))
    else:
        session_upload_url = f"local://{uuid4().hex}"

    upload = UploadSession.objects.create(
        user=user,
        storage_provider=provider,
        file_name=clean_name,
        original_file_name=file_name,
        file_size=file_size,
        content_type=content_type or "application/octet-stream",
        chunk_size=settings.UPLOAD_CHUNK_SIZE,
        upload_url=session_upload_url,
        drive_id=settings.ONEDRIVE_DRIVE_ID if provider == UploadSession.StorageProvider.ONEDRIVE else "local",
        parent_path=relative_path or "",
        expires_at=expiration,
        status=UploadSession.Status.IN_PROGRESS,
    )
    logger.info("upload.init upload_id=%s user_id=%s size=%s", upload.id, user.id, file_size)
    return upload


def ensure_upload_for_user(upload_id, user):
    upload = UploadSession.objects.filter(id=upload_id, user=user).first()
    if not upload:
        return None
    return upload


def register_stored_file_from_upload(upload: UploadSession, *, company=None, field_slot=StoredFile.FieldSlot.OTHER):
    provider = upload.storage_provider
    download_url = ""
    if provider == UploadSession.StorageProvider.LOCAL and not upload.onedrive_item_id:
        finalize_local_upload(upload)

    sha256 = upload.sha256
    md5 = upload.md5
    if provider == UploadSession.StorageProvider.ONEDRIVE:
        client = OneDriveClient()
        download_url, metadata = client.get_download_url(upload.onedrive_item_id)
        if not sha256 or not md5:
            stream_resp = client.stream_item_content(upload.onedrive_item_id)
            sha256, md5 = compute_hashes_from_streaming_response(stream_resp)
            upload.sha256 = sha256
            upload.md5 = md5
            upload.save(update_fields=["sha256", "md5", "updated_at"])
    else:
        if not sha256 or not md5:
            relative_path = upload.onedrive_item_id
            absolute_path = os.path.join(settings.MEDIA_ROOT, relative_path)
            sha256_obj = hashlib.sha256()
            md5_obj = hashlib.md5()
            with open(absolute_path, "rb") as f:
                while True:
                    chunk = f.read(1024 * 1024)
                    if not chunk:
                        break
                    sha256_obj.update(chunk)
                    md5_obj.update(chunk)
            sha256 = sha256_obj.hexdigest()
            md5 = md5_obj.hexdigest()
            upload.sha256 = sha256
            upload.md5 = md5
            upload.save(update_fields=["sha256", "md5", "updated_at"])

    stored = StoredFile.objects.create(
        upload_session=upload,
        uploaded_by=upload.user,
        company=company,
        field_slot=field_slot,
        provider=StoredFile.Provider.ONEDRIVE if provider == UploadSession.StorageProvider.ONEDRIVE else StoredFile.Provider.LOCAL,
        provider_item_id=upload.onedrive_item_id,
        drive_id=upload.drive_id or "local",
        file_name=upload.file_name,
        original_file_name=upload.original_file_name or upload.file_name,
        content_type=upload.content_type,
        file_size=upload.file_size,
        sha256=sha256,
        md5=md5,
        download_url_cache=download_url or "",
        download_url_expires_at=timezone.now() + timedelta(minutes=45) if provider == UploadSession.StorageProvider.ONEDRIVE else None,
    )
    return stored


def upload_uploaded_file_directly(*, user, uploaded_file, relative_path="", company=None, field_slot=StoredFile.FieldSlot.OTHER):
    client = OneDriveClient()
    file_name = sanitize_filename(uploaded_file.name)
    file_size = int(uploaded_file.size)
    validate_upload_constraints(file_name, file_size)

    session_data = client.create_upload_session(relative_path=relative_path, file_name=file_name)
    upload = UploadSession.objects.create(
        user=user,
        file_name=file_name,
        original_file_name=uploaded_file.name,
        file_size=file_size,
        content_type=getattr(uploaded_file, "content_type", "") or "application/octet-stream",
        chunk_size=settings.UPLOAD_CHUNK_SIZE,
        upload_url=session_data["upload_url"],
        drive_id=settings.ONEDRIVE_DRIVE_ID,
        parent_path=relative_path or "",
        status=UploadSession.Status.IN_PROGRESS,
        expires_at=client.parse_expiration(session_data.get("expiration_date_time")),
    )

    sha256 = hashlib.sha256()
    md5 = hashlib.md5()
    start = 0
    uploaded_file.open("rb")
    try:
        while True:
            chunk = uploaded_file.read(settings.UPLOAD_CHUNK_SIZE)
            if not chunk:
                break
            sha256.update(chunk)
            md5.update(chunk)

            end = start + len(chunk) - 1
            chunk_result = client.upload_chunk(
                upload_url=upload.upload_url,
                start=start,
                end=end,
                total=file_size,
                chunk_bytes=chunk,
            )
            start = end + 1
            upload.bytes_sent = start
            if chunk_result.get("complete"):
                upload.onedrive_item_id = chunk_result.get("item_id")
                upload.status = UploadSession.Status.COMPLETED
                upload.completed_at = timezone.now()
            upload.save(update_fields=["bytes_sent", "onedrive_item_id", "status", "completed_at", "updated_at"])
    except Exception as exc:
        upload.status = UploadSession.Status.FAILED
        upload.last_error = str(exc)
        upload.save(update_fields=["status", "last_error", "updated_at"])
        raise
    finally:
        uploaded_file.close()

    upload.sha256 = sha256.hexdigest()
    upload.md5 = md5.hexdigest()
    upload.save(update_fields=["sha256", "md5", "updated_at"])
    return register_stored_file_from_upload(upload, company=company, field_slot=field_slot)
