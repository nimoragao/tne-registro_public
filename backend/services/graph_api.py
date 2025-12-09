# services/graph_api.py
import os
import requests
from msal import ConfidentialClientApplication
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
TENANT_ID = os.getenv("TENANT_ID")
SHAREPOINT_HOST = os.getenv("SHAREPOINT_HOST")
SHAREPOINT_SITE_NAME = os.getenv("SHAREPOINT_SITE_NAME")
SHAREPOINT_DRIVE_NAME = os.getenv("SHAREPOINT_DRIVE_NAME")
EXCEL_FILE_PATH = os.getenv("EXCEL_FILE_PATH")

AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"
SCOPE = ["https://graph.microsoft.com/.default"]
GRAPH_BASE = "https://graph.microsoft.com/v1.0"

_app = ConfidentialClientApplication(CLIENT_ID, authority=AUTHORITY, client_credential=CLIENT_SECRET)
_token_cache = None
_site_id_cache = None
_drive_id_cache = None

def get_access_token() -> str:
    global _token_cache
    result = _app.acquire_token_silent(SCOPE, account=None)
    if not result:
        result = _app.acquire_token_for_client(scopes=SCOPE)
    if "access_token" not in result:
        raise Exception(f"Could not obtain access token: {result}")
    return result["access_token"]

def get_site_id() -> str:
    global _site_id_cache
    if _site_id_cache:
        return _site_id_cache
    token = get_access_token()
    headers = {"Authorization": f"Bearer {token}"}
    # endpoint: /sites/{host}:/sites/{siteName}
    url = f"{GRAPH_BASE}/sites/{SHAREPOINT_HOST}:/sites/{SHAREPOINT_SITE_NAME}"
    r = requests.get(url, headers=headers)
    r.raise_for_status()
    _site_id_cache = r.json()["id"]
    return _site_id_cache

def get_drive_id() -> str:
    global _drive_id_cache
    if _drive_id_cache:
        return _drive_id_cache
    token = get_access_token()
    headers = {"Authorization": f"Bearer {token}"}
    site_id = get_site_id()
    # list drives for the site, find the named drive
    url = f"{GRAPH_BASE}/sites/{site_id}/drives"
    r = requests.get(url, headers=headers)
    r.raise_for_status()
    drives = r.json().get("value", [])
    for d in drives:
        if d.get("name") == SHAREPOINT_DRIVE_NAME or d.get("name").lower() == SHAREPOINT_DRIVE_NAME.lower():
            _drive_id_cache = d["id"]
            return _drive_id_cache
    # fallback: use default drive
    url2 = f"{GRAPH_BASE}/sites/{site_id}/drive"
    r2 = requests.get(url2, headers=headers)
    r2.raise_for_status()
    _drive_id_cache = r2.json()["id"]
    return _drive_id_cache

def download_file_bytes() -> bytes:
    token = get_access_token()
    headers = {"Authorization": f"Bearer {token}"}
    site_id = get_site_id()
    drive_id = get_drive_id()
    # GET /drives/{driveId}/root:/{path}:/content
    path = EXCEL_FILE_PATH.lstrip("/")
    url = f"{GRAPH_BASE}/drives/{drive_id}/root:/{path}:/content"
    r = requests.get(url, headers=headers)
    r.raise_for_status()
    return r.content

def upload_file_bytes(file_bytes: bytes) -> None:
    token = get_access_token()
    headers = {"Authorization": f"Bearer {token}"}
    site_id = get_site_id()
    drive_id = get_drive_id()
    path = EXCEL_FILE_PATH.lstrip("/")
    url = f"{GRAPH_BASE}/drives/{drive_id}/root:/{path}:/content"
    r = requests.put(url, headers=headers, data=file_bytes)
    r.raise_for_status()
    return
