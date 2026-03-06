import logging
import time
from datetime import timedelta

import requests
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger(__name__)


class OneDriveError(Exception):
    pass


class OneDriveClient:
    TOKEN_CACHE_KEY = "onedrive_graph_access_token"

    def __init__(self):
        self.base_url = settings.ONEDRIVE_GRAPH_BASE_URL.rstrip("/")
        self.tenant_id = settings.ONEDRIVE_TENANT_ID
        self.client_id = settings.ONEDRIVE_CLIENT_ID
        self.client_secret = settings.ONEDRIVE_CLIENT_SECRET
        self.drive_id = settings.ONEDRIVE_DRIVE_ID
        self.base_path = settings.ONEDRIVE_BASE_PATH.strip("/")
        self.timeout = settings.ONEDRIVE_TIMEOUT_SECONDS
        self.max_retries = settings.ONEDRIVE_MAX_RETRIES

    def _required_config(self):
        missing = []
        for key in [
            "ONEDRIVE_TENANT_ID",
            "ONEDRIVE_CLIENT_ID",
            "ONEDRIVE_CLIENT_SECRET",
            "ONEDRIVE_DRIVE_ID",
        ]:
            if not getattr(settings, key, None):
                missing.append(key)
        if missing:
            raise OneDriveError(f"OneDrive nao configurado. Variaveis ausentes: {', '.join(missing)}")

    def _get_access_token(self):
        self._required_config()
        cached = cache.get(self.TOKEN_CACHE_KEY)
        if cached:
            return cached

        token_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        payload = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "scope": "https://graph.microsoft.com/.default",
        }
        response = requests.post(token_url, data=payload, timeout=self.timeout)
        if response.status_code >= 400:
            raise OneDriveError(f"Falha ao obter token do Graph ({response.status_code}): {response.text}")

        data = response.json()
        access_token = data.get("access_token")
        expires_in = int(data.get("expires_in", 3599))
        cache_seconds = max(60, expires_in - 120)
        cache.set(self.TOKEN_CACHE_KEY, access_token, cache_seconds)
        return access_token

    def _request(self, method, url, *, headers=None, json=None, data=None, stream=False, allow_redirects=True):
        token = self._get_access_token()
        auth_headers = {"Authorization": f"Bearer {token}"}
        if headers:
            auth_headers.update(headers)

        for attempt in range(self.max_retries + 1):
            try:
                response = requests.request(
                    method=method,
                    url=url,
                    headers=auth_headers,
                    json=json,
                    data=data,
                    timeout=self.timeout,
                    stream=stream,
                    allow_redirects=allow_redirects,
                )
                if response.status_code in (429, 500, 502, 503, 504) and attempt < self.max_retries:
                    backoff = min(8, 2 ** attempt)
                    time.sleep(backoff)
                    continue
                return response
            except requests.RequestException:
                if attempt >= self.max_retries:
                    raise
                time.sleep(min(8, 2 ** attempt))
        raise OneDriveError("Falha inesperada na chamada ao Graph.")

    def create_upload_session(self, *, relative_path, file_name):
        safe_path = "/".join([p.strip("/") for p in [self.base_path, relative_path] if p and p.strip("/")])
        if safe_path:
            url = f"{self.base_url}/drives/{self.drive_id}/root:/{safe_path}/{file_name}:/createUploadSession"
        else:
            url = f"{self.base_url}/drives/{self.drive_id}/root:/{file_name}:/createUploadSession"
        payload = {
            "item": {
                "@microsoft.graph.conflictBehavior": "rename",
                "name": file_name,
            }
        }
        response = self._request("POST", url, json=payload)
        if response.status_code >= 400:
            raise OneDriveError(f"Falha ao criar upload session ({response.status_code}): {response.text}")
        body = response.json()
        return {
            "upload_url": body.get("uploadUrl"),
            "expiration_date_time": body.get("expirationDateTime"),
        }

    def upload_chunk(self, *, upload_url, start, end, total, chunk_bytes):
        headers = {
            "Content-Length": str(len(chunk_bytes)),
            "Content-Range": f"bytes {start}-{end}/{total}",
        }
        response = requests.put(upload_url, headers=headers, data=chunk_bytes, timeout=self.timeout)
        if response.status_code in (200, 201):
            data = response.json()
            return {
                "complete": True,
                "item_id": data.get("id"),
                "name": data.get("name"),
                "size": data.get("size"),
                "raw": data,
            }
        if response.status_code == 202:
            data = response.json()
            return {
                "complete": False,
                "next_expected_ranges": data.get("nextExpectedRanges", []),
                "raw": data,
            }
        raise OneDriveError(f"Falha no upload de chunk ({response.status_code}): {response.text}")

    def get_item_metadata(self, item_id):
        url = f"{self.base_url}/drives/{self.drive_id}/items/{item_id}?$select=id,name,size,file,@microsoft.graph.downloadUrl"
        response = self._request("GET", url)
        if response.status_code >= 400:
            raise OneDriveError(f"Falha ao obter metadata do item ({response.status_code}): {response.text}")
        return response.json()

    def get_download_url(self, item_id):
        data = self.get_item_metadata(item_id)
        return data.get("@microsoft.graph.downloadUrl"), data

    def stream_item_content(self, item_id, range_header=None):
        url = f"{self.base_url}/drives/{self.drive_id}/items/{item_id}/content"
        headers = {}
        if range_header:
            headers["Range"] = range_header
        response = self._request("GET", url, headers=headers, stream=True, allow_redirects=True)
        if response.status_code >= 400:
            raise OneDriveError(f"Falha ao baixar conteudo ({response.status_code})")
        return response

    @staticmethod
    def parse_expiration(expiration_iso):
        if not expiration_iso:
            return None
        try:
            # Ex: 2026-03-05T18:15:56.902Z
            clean = expiration_iso.replace("Z", "+00:00")
            return timezone.datetime.fromisoformat(clean)
        except Exception:
            return timezone.now() + timedelta(hours=1)
