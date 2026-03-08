import hashlib
import logging
import os
from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.http import HttpResponseRedirect, StreamingHttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import BaseParser, FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.utils.permissions import user_has_access_to_company

from .models import ActionPlan, Answer, Company, Evaluation, StoredFile, UploadSession
from .storage.onedrive.client import OneDriveClient, OneDriveError
from .upload_service import (
    append_local_chunk,
    cleanup_orphan_local_parts,
    create_upload_session_for_user,
    ensure_upload_for_user,
    finalize_local_upload,
    get_local_tmp_file_path,
    register_stored_file_from_upload,
    validate_upload_constraints,
)

logger = logging.getLogger(__name__)


def _as_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


class RawChunkParser(BaseParser):
    media_type = "application/octet-stream"

    def parse(self, stream, media_type=None, parser_context=None):
        return {"chunk": stream.read()}


class UploadInitView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def post(self, request):
        # Limpeza leve de .part orfaos com throttle para evitar custo por request.
        if (getattr(settings, "STORAGE_PROVIDER", "onedrive") or "").lower() == UploadSession.StorageProvider.LOCAL:
            cleanup_key = "local_upload_cleanup_last_run"
            if not cache.get(cleanup_key):
                try:
                    cleanup_result = cleanup_orphan_local_parts()
                    logger.info("upload.cleanup_local deleted=%s kept=%s", cleanup_result["deleted"], cleanup_result["kept"])
                except Exception as exc:
                    logger.warning("upload.cleanup_local failed: %s", exc)
                interval = max(60, int(getattr(settings, "LOCAL_UPLOAD_CLEANUP_INTERVAL_SECONDS", 1800)))
                cache.set(cleanup_key, "1", interval)

        file_name = request.data.get("file_name") or request.data.get("name")
        file_size = _as_int(request.data.get("file_size"))
        content_type = request.data.get("content_type", "application/octet-stream")
        relative_path = request.data.get("relative_path", "")

        if not file_name or not file_size:
            return Response({"detail": "file_name e file_size sao obrigatorios."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_upload_constraints(file_name, file_size)
            upload = create_upload_session_for_user(
                user=request.user,
                file_name=file_name,
                file_size=file_size,
                content_type=content_type,
                relative_path=relative_path,
            )
        except (ValueError, OneDriveError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "upload_id": str(upload.id),
                "status": upload.status,
                "chunk_size": upload.chunk_size,
                "file_name": upload.file_name,
                "file_size": upload.file_size,
                "expires_at": upload.expires_at,
            },
            status=status.HTTP_201_CREATED,
        )


class UploadChunkView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, RawChunkParser]

    def put(self, request, upload_id):
        upload = ensure_upload_for_user(upload_id, request.user)
        if not upload:
            return Response({"detail": "Upload nao encontrado."}, status=status.HTTP_404_NOT_FOUND)
        if upload.status in (UploadSession.Status.COMPLETED, UploadSession.Status.CANCELED):
            return Response({"detail": "Upload nao aceita novos chunks."}, status=status.HTTP_409_CONFLICT)

        start = _as_int(request.headers.get("X-Chunk-Start") or request.data.get("start"))
        end = _as_int(request.headers.get("X-Chunk-End") or request.data.get("end"))
        total = _as_int(request.headers.get("X-Chunk-Total") or request.data.get("total") or upload.file_size)
        chunk_file = request.FILES.get("chunk") or request.data.get("chunk")
        chunk_bytes = b""
        if chunk_file is not None and hasattr(chunk_file, "read"):
            chunk_bytes = chunk_file.read()
        elif isinstance(chunk_file, (bytes, bytearray)):
            chunk_bytes = bytes(chunk_file)
        elif request.body:
            # Compatibilidade para clientes que enviam chunk em octet-stream puro.
            chunk_bytes = request.body

        if not chunk_bytes:
            upload.last_error = "Chunk ausente na requisicao."
            upload.save(update_fields=["last_error", "updated_at"])
            return Response({"detail": "Campo chunk obrigatorio."}, status=status.HTTP_400_BAD_REQUEST)
        expected_end = start + len(chunk_bytes) - 1
        if end != expected_end:
            upload.last_error = f"Range invalido. start={start} end={end} expected_end={expected_end}"
            upload.save(update_fields=["last_error", "updated_at"])
            return Response({"detail": "Range invalido para chunk."}, status=status.HTTP_400_BAD_REQUEST)
        if total != upload.file_size:
            upload.last_error = f"Total divergente. total={total} expected={upload.file_size}"
            upload.save(update_fields=["last_error", "updated_at"])
            return Response({"detail": "Total de bytes difere do upload iniciado."}, status=status.HTTP_400_BAD_REQUEST)

        if start < upload.bytes_sent:
            if end < upload.bytes_sent:
                return Response(
                    {"status": "duplicate", "bytes_sent": upload.bytes_sent},
                    status=status.HTTP_200_OK,
                )
            upload.last_error = f"Chunk sobreposto invalido. start={start} bytes_sent={upload.bytes_sent}"
            upload.save(update_fields=["last_error", "updated_at"])
            return Response({"detail": "Chunk sobreposto invalido."}, status=status.HTTP_409_CONFLICT)
        if start > upload.bytes_sent:
            upload.last_error = f"Chunk fora de ordem. start={start} expected_start={upload.bytes_sent}"
            upload.save(update_fields=["last_error", "updated_at"])
            return Response(
                {"detail": "Chunk fora de ordem.", "expected_start": upload.bytes_sent},
                status=status.HTTP_409_CONFLICT,
            )

        retries = 0
        result = {"complete": False}
        if upload.storage_provider == UploadSession.StorageProvider.LOCAL:
            append_local_chunk(upload, chunk_bytes)
            result["complete"] = (end + 1) >= total
        else:
            client = OneDriveClient()
            while True:
                try:
                    result = client.upload_chunk(
                        upload_url=upload.upload_url,
                        start=start,
                        end=end,
                        total=total,
                        chunk_bytes=chunk_bytes,
                    )
                    break
                except Exception as exc:
                    retries += 1
                    if retries > 3:
                        upload.status = UploadSession.Status.FAILED
                        upload.last_error = str(exc)
                        upload.retry_count += retries
                        upload.save(update_fields=["status", "last_error", "retry_count", "updated_at"])
                        return Response({"detail": "Falha ao enviar chunk ao OneDrive."}, status=status.HTTP_502_BAD_GATEWAY)

        upload.bytes_sent = end + 1
        upload.retry_count += retries
        upload.status = UploadSession.Status.IN_PROGRESS
        if result.get("complete"):
            upload.status = UploadSession.Status.COMPLETED
            if upload.storage_provider == UploadSession.StorageProvider.ONEDRIVE:
                upload.onedrive_item_id = result.get("item_id", "")
            upload.completed_at = timezone.now()
        upload.save(
            update_fields=[
                "bytes_sent",
                "retry_count",
                "status",
                "onedrive_item_id",
                "completed_at",
                "updated_at",
            ]
        )
        logger.info("upload.chunk upload_id=%s bytes_sent=%s", upload.id, upload.bytes_sent)

        return Response(
            {
                "status": upload.status,
                "bytes_sent": upload.bytes_sent,
                "complete": upload.status == UploadSession.Status.COMPLETED,
            }
        )


class UploadCompleteView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser]

    def post(self, request, upload_id):
        upload = ensure_upload_for_user(upload_id, request.user)
        if not upload:
            return Response({"detail": "Upload nao encontrado."}, status=status.HTTP_404_NOT_FOUND)
        if upload.bytes_sent != upload.file_size:
            return Response(
                {"detail": "Upload incompleto.", "bytes_sent": upload.bytes_sent, "total": upload.file_size},
                status=status.HTTP_409_CONFLICT,
            )
        if not upload.onedrive_item_id:
            if upload.storage_provider == UploadSession.StorageProvider.LOCAL:
                try:
                    finalize_local_upload(upload)
                except Exception as exc:
                    return Response({"detail": f"Falha ao finalizar upload local: {exc}"}, status=status.HTTP_409_CONFLICT)
            else:
                return Response({"detail": "Item OneDrive nao confirmado ainda."}, status=status.HTTP_409_CONFLICT)

        expected_sha256 = request.data.get("sha256", "")
        company_id = request.data.get("company_id")
        answer_id = request.data.get("answer_id")
        action_plan_id = request.data.get("action_plan_id")
        evaluation_id = request.data.get("evaluation_id")
        field_slot = request.data.get("field_slot", StoredFile.FieldSlot.OTHER)

        answer = None
        action_plan = None
        company = None

        # Fonte canonica de empresa: objeto vinculado (resposta/plano), nao contexto de UI.
        if answer_id:
            answer = get_object_or_404(Answer.objects.select_related("evaluation__company"), id=answer_id)
            company = answer.evaluation.company
            access_check = user_has_access_to_company(request.user, company=company)
            if access_check is not True:
                return access_check

        if action_plan_id:
            action_plan = get_object_or_404(ActionPlan.objects.select_related("company"), id=action_plan_id)
            if company and company.id != action_plan.company_id:
                return Response(
                    {"detail": "A resposta e o plano de acao pertencem a empresas diferentes."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            company = action_plan.company
            access_check = user_has_access_to_company(request.user, company=company)
            if access_check is not True:
                return access_check

        if company is None and evaluation_id:
            evaluation = get_object_or_404(Evaluation.objects.select_related("company"), id=evaluation_id)
            company = evaluation.company
            access_check = user_has_access_to_company(request.user, company=company)
            if access_check is not True:
                return access_check

        # Compatibilidade com clientes antigos.
        if company is None and company_id:
            company = Company.objects.filter(id=company_id).first()
            if not company:
                return Response({"detail": "Empresa informada no upload nao existe."}, status=status.HTTP_400_BAD_REQUEST)
            access_check = user_has_access_to_company(request.user, company=company)
            if access_check is not True:
                return access_check

        try:
            stored = register_stored_file_from_upload(upload, company=company, field_slot=field_slot)
        except Exception as exc:
            upload.status = UploadSession.Status.FAILED
            upload.last_error = str(exc)
            upload.save(update_fields=["status", "last_error", "updated_at"])
            return Response({"detail": "Falha ao registrar arquivo final."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if expected_sha256 and stored.sha256 != expected_sha256:
            upload.status = UploadSession.Status.FAILED
            upload.last_error = "Checksum SHA256 divergente."
            upload.save(update_fields=["status", "last_error", "updated_at"])
            stored.delete()
            return Response({"detail": "Checksum divergente."}, status=status.HTTP_400_BAD_REQUEST)

        if answer:
            if field_slot == StoredFile.FieldSlot.ANSWER_EVALUATOR:
                answer.attachment_evaluator_file = stored
                answer.save(update_fields=["attachment_evaluator_file"])
            else:
                answer.attachment_respondent_file = stored
                answer.save(update_fields=["attachment_respondent_file"])
        if action_plan:
            action_plan.attachment_file = stored
            action_plan.save(update_fields=["attachment_file"])

        logger.info("upload.complete upload_id=%s stored_file_id=%s", upload.id, stored.id)
        return Response(
            {
                "upload_id": str(upload.id),
                "file_id": str(stored.id),
                "sha256": stored.sha256,
                "md5": stored.md5,
                "file_name": stored.original_file_name,
                "size": stored.file_size,
            }
        )


class FileDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def _check_access(self, user, stored_file: StoredFile):
        if user.is_superuser:
            return True
        if stored_file.company_id and user.companies.filter(id=stored_file.company_id, is_active=True).exists():
            return True
        return False

    def get(self, request, file_id):
        stored_file = get_object_or_404(StoredFile, id=file_id, is_active=True)
        if not self._check_access(request.user, stored_file):
            return Response({"detail": "Sem permissao para este arquivo."}, status=status.HTTP_403_FORBIDDEN)

        mode = request.query_params.get("mode", "redirect")
        client = OneDriveClient()
        download_url = stored_file.download_url_cache
        should_refresh = (
            not download_url
            or not stored_file.download_url_expires_at
            or stored_file.download_url_expires_at <= timezone.now()
        )

        if should_refresh:
            if stored_file.provider == StoredFile.Provider.ONEDRIVE:
                download_url, _meta = client.get_download_url(stored_file.provider_item_id)
                stored_file.download_url_cache = download_url or ""
                stored_file.download_url_expires_at = timezone.now() + timedelta(minutes=45)
                stored_file.save(update_fields=["download_url_cache", "download_url_expires_at", "updated_at"])
            else:
                download_url = request.build_absolute_uri(f"/api/files/{stored_file.id}/download/?mode=proxy")

        if mode == "json":
            return Response(
                {
                    "url": download_url,
                    "file_name": stored_file.original_file_name,
                    "content_type": stored_file.content_type or "application/octet-stream",
                }
            )

        if mode == "proxy":
            if stored_file.provider == StoredFile.Provider.ONEDRIVE:
                range_header = request.headers.get("Range")
                response = client.stream_item_content(stored_file.provider_item_id, range_header=range_header)
                stream_response = StreamingHttpResponse(
                    streaming_content=response.iter_content(chunk_size=1024 * 1024),
                    status=response.status_code,
                    content_type=stored_file.content_type or "application/octet-stream",
                )
                if response.headers.get("Content-Range"):
                    stream_response["Content-Range"] = response.headers.get("Content-Range")
                    stream_response["Accept-Ranges"] = "bytes"
                if response.headers.get("Content-Length"):
                    stream_response["Content-Length"] = response.headers.get("Content-Length")
                stream_response["Content-Disposition"] = f'attachment; filename="{stored_file.original_file_name}"'
                stream_response["X-Content-Type-Options"] = "nosniff"
                return stream_response

            absolute_path = os.path.join(settings.MEDIA_ROOT, stored_file.provider_item_id)
            if not os.path.exists(absolute_path):
                return Response({"detail": "Arquivo local nao encontrado."}, status=status.HTTP_404_NOT_FOUND)

            range_header = request.headers.get("Range")
            file_size = os.path.getsize(absolute_path)
            content_type = stored_file.content_type or "application/octet-stream"
            if range_header and range_header.startswith("bytes="):
                try:
                    range_spec = range_header.split("=", 1)[1]
                    start_s, end_s = range_spec.split("-", 1)
                    start = int(start_s) if start_s else 0
                    end = int(end_s) if end_s else file_size - 1
                    start = max(0, start)
                    end = min(file_size - 1, end)
                except Exception:
                    return Response({"detail": "Range invalido."}, status=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE)

                def partial_iter(path, start_pos, end_pos, chunk_size=1024 * 1024):
                    with open(path, "rb") as f:
                        f.seek(start_pos)
                        remaining = end_pos - start_pos + 1
                        while remaining > 0:
                            data = f.read(min(chunk_size, remaining))
                            if not data:
                                break
                            remaining -= len(data)
                            yield data

                resp = StreamingHttpResponse(partial_iter(absolute_path, start, end), status=206, content_type=content_type)
                resp["Content-Range"] = f"bytes {start}-{end}/{file_size}"
                resp["Content-Length"] = str(end - start + 1)
                resp["Accept-Ranges"] = "bytes"
                resp["Content-Disposition"] = f'attachment; filename="{stored_file.original_file_name}"'
                resp["X-Content-Type-Options"] = "nosniff"
                return resp

            def full_iter(path, chunk_size=1024 * 1024):
                with open(path, "rb") as f:
                    while True:
                        data = f.read(chunk_size)
                        if not data:
                            break
                        yield data

            resp = StreamingHttpResponse(full_iter(absolute_path), status=200, content_type=content_type)
            resp["Content-Length"] = str(file_size)
            resp["Accept-Ranges"] = "bytes"
            resp["Content-Disposition"] = f'attachment; filename="{stored_file.original_file_name}"'
            resp["X-Content-Type-Options"] = "nosniff"
            return resp

        return HttpResponseRedirect(download_url)
