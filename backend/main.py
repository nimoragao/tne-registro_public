import sys
import os
import io
import pandas as pd
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse  # <--- NUEVA IMPORTACIÓN
from pydantic import BaseModel
from dotenv import load_dotenv
from azure.storage.blob import BlobServiceClient
import uvicorn
import pytz 

# ---------------------------
# Configuración de Rutas y Entorno
# ---------------------------
if getattr(sys, 'frozen', False):
    app_path = sys._MEIPASS
else:
    app_path = os.path.dirname(os.path.abspath(__file__))

dotenv_path = os.path.join(app_path, '.env')
load_dotenv(dotenv_path)

AZURE_ACCOUNT_NAME = os.getenv("AZURE_ACCOUNT_NAME")
AZURE_CONTAINER_NAME = os.getenv("AZURE_CONTAINER_NAME")
AZURE_SAS_TOKEN = os.getenv("AZURE_SAS_TOKEN")

# --- CONFIGURACIÓN DE NOMBRES DE ARCHIVOS ---
EXCEL_BLOB_NAME = os.getenv("EXCEL_BLOB_NAME", "1.0 pre_alpha tne/data.xlsx")
AUTH_BLOB_NAME = "1.0 pre_alpha tne/usuarios.xlsx" 
LOCAL_AUTH_FILE = "usuarios.xlsx"

# ---------------------------
# Inicialización de APP
# ---------------------------
app = FastAPI(title="TNE Backend (Simple Auth)")

origins = [
    "https://tne-registro.vercel.app",
    "http://127.0.0.1:8000",
    "app://."
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
# Modelos Pydantic
# ---------------------------
class EntregaRequest(BaseModel):
    folio: str | None = None
    rut: str | None = None
    responsable: str | None = None

class LoginRequest(BaseModel):
    email: str

# ---------------------------
# Conexión Azure Blob Storage
# ---------------------------
try:
    blob_service_client = BlobServiceClient(
        account_url=f"https://{AZURE_ACCOUNT_NAME}.blob.core.windows.net",
        credential=AZURE_SAS_TOKEN
    )
    container_client = blob_service_client.get_container_client(AZURE_CONTAINER_NAME)
    blob_client_data = container_client.get_blob_client(EXCEL_BLOB_NAME)
    # Cliente para Auth
    blob_client_auth = container_client.get_blob_client(AUTH_BLOB_NAME)
    
    print(f"✅ [Azure] Conectado a: {AZURE_CONTAINER_NAME}")

except Exception as e:
    print(f"❌ [Azure] Error crítico: {e}")

# ---------------------------
# Utilidades y Mapeo de Excel
# ---------------------------
COLUMN_MAPPING = {
    'RUT': 'RUT', 'N° DE FOLIO': 'Folio', 'FOLIO': 'Folio', 'Folio': 'Folio',
    'NOMBRE': 'NOMBRE COMPLETO', 'NOMBRE COMPLETO': 'NOMBRE COMPLETO',
    'MAIL': 'Mail', 'Mail': 'Mail',
    'ESTADO DE ENTREGA': 'EntregadoStatus', 'ENTREGADO': 'EntregadoStatus', 'EntregadoStatus': 'EntregadoStatus',
    'FECHA DE ENTREGA': 'FechaEntrega', 'FechaEntrega': 'FechaEntrega',
    'RESPONSABLE': 'Responsable', 'Responsable': 'Responsable',
    'DV': 'DigitoVerificador', 'DigitoVerificador': 'DigitoVerificador',
    'N° DE GUIA DESPACHO': 'GuiaDespacho', 'GuiaDespacho': 'GuiaDespacho',
    'N° DE GUIA': 'NumeroGuia', 'NumeroGuia': 'NumeroGuia'
}

REQUIRED_COLUMNS = [
    'Folio', 'RUT', 'DigitoVerificador', 'GuiaDespacho', 'NumeroGuia', 
    'NOMBRE COMPLETO', 'Mail', 'Responsable', 'FechaEntrega', 'EntregadoStatus'
]

def download_excel_bytes(client) -> bytes:
    return client.download_blob().readall()

def upload_excel_bytes(client, data: bytes):
    client.upload_blob(data, overwrite=True)

def read_excel_from_bytes(data: bytes) -> pd.DataFrame:
    try:
        df = pd.read_excel(io.BytesIO(data), dtype=str, engine="openpyxl")
    except:
        try:
            df = pd.read_csv(io.BytesIO(data), sep=',', encoding='utf-8', dtype=str)
        except:
            df = pd.read_csv(io.BytesIO(data), sep=';', encoding='latin1', dtype=str)

    df.columns = [str(c).strip() for c in df.columns]
    renames = {old.strip(): new for old, new in COLUMN_MAPPING.items() if old.strip() in df.columns}
    df.rename(columns=renames, inplace=True)
    
    if 'EntregadoStatus' in df.columns:
        df['EntregadoStatus'] = df['EntregadoStatus'].astype(str).str.upper().str.strip()
        df['EntregadoStatus'] = df['EntregadoStatus'].replace(['TRUE', 'SI', 'X', '1', 'ENTREGADA'], 'ENTREGADA')
        df['EntregadoStatus'] = df['EntregadoStatus'].replace(['FALSE', 'NO', '0', '', 'NAN', 'nan'], 'PENDIENTE DE ENTREGA')
        df['EntregadoStatus'] = df['EntregadoStatus'].fillna('PENDIENTE DE ENTREGA')
    else:
        df['EntregadoStatus'] = 'PENDIENTE DE ENTREGA'

    for col in REQUIRED_COLUMNS:
        if col not in df.columns: df[col] = ''
    return df

def df_to_excel_bytes(df: pd.DataFrame) -> bytes:
    bio = io.BytesIO()
    all_cols = [c for c in df.columns if c not in REQUIRED_COLUMNS]
    final_cols = list(dict.fromkeys(REQUIRED_COLUMNS + all_cols))
    with pd.ExcelWriter(bio, engine="openpyxl") as writer:
        cols_to_write = [col for col in final_cols if col in df.columns]
        df[cols_to_write].to_excel(writer, index=False)
    bio.seek(0)
    return bio.read()

def find_row_index(df: pd.DataFrame, folio=None, rut=None):
    if folio:
        idx = df.index[df['Folio'].astype(str).str.strip() == str(folio).strip()]
        if not idx.empty: return idx[0]
    if rut:
        idx = df.index[df['RUT'].astype(str).str.strip() == str(rut).strip()]
        if not idx.empty: return idx[0]
    return None

# ---------------------------
# Lógica de Autenticación
# ---------------------------
def get_roles():
    admins = []
    tutores = []
    
    excel_data = None
    source = "N/A"

    # 1. Intentar Azure
    try:
        print(f"📥 Descargando {AUTH_BLOB_NAME}...")
        data = download_excel_bytes(blob_client_auth)
        excel_data = io.BytesIO(data)
        source = "Azure"
    except Exception as e:
        print(f"   ⚠️ Azure falló ({e}). Buscando local...")
        
        # 2. Intentar Local
        if os.path.exists(os.path.join(app_path, LOCAL_AUTH_FILE)):
            try:
                with open(os.path.join(app_path, LOCAL_AUTH_FILE), "rb") as f:
                    excel_data = io.BytesIO(f.read())
                source = "Local"
            except: pass
    
    if excel_data:
        try:
            xls = pd.ExcelFile(excel_data)
            print(f"   📄 Hojas encontradas ({source}): {xls.sheet_names}")

            # Función genérica para buscar correos en una hoja
            def get_emails_from_sheet(sheet_name):
                # Buscar nombre de hoja flexible (ignorando mayúsculas)
                real_name = next((s for s in xls.sheet_names if sheet_name.lower() in s.lower()), None)
                if not real_name: return []
                
                df = pd.read_excel(xls, real_name, dtype=str)
                # Buscar columna CORREO o EMAIL
                col = next((c for c in df.columns if 'CORREO' in str(c).upper() or 'EMAIL' in str(c).upper()), None)
                
                if col:
                    return df[col].astype(str).str.strip().str.lower().dropna().tolist()
                return []

            admins = get_emails_from_sheet('Admins')
            tutores = get_emails_from_sheet('Tutores')
            
            # Si no encuentra la hoja "Tutores", usa la primera hoja disponible por defecto
            if not tutores and not admins and len(xls.sheet_names) > 0:
                print("   ⚠️ No se encontraron hojas 'Admins'/'Tutores'. Usando primera hoja como Tutores.")
                tutores = get_emails_from_sheet(xls.sheet_names[0])

            print(f"   📊 Roles cargados: {len(admins)} Admins, {len(tutores)} Tutores")
            
        except Exception as e:
            print(f"   ❌ Error procesando Excel: {e}")

    return admins, tutores

# ---------------------------
# ENDPOINTS
# ---------------------------

@app.post("/login")
def login(request: LoginRequest):
    email_input = request.email.strip().lower()
    print(f"🔑 Login: {email_input}")
    
    admins, tutores = get_roles()
    
    # Verificar Admin
    if email_input in admins:
        print("   ✅ ADMIN")
        return {"status": "ok", "role": "admin"}
    
    # Verificar Tutor
    if email_input in tutores:
        print("   ✅ TUTOR")
        return {"status": "ok", "role": "tutor"}
    
    # Verificar si está en la lista combinada (fallback)
    if email_input in admins + tutores:
        print("   ✅ (Fallback) TUTOR")
        return {"status": "ok", "role": "tutor"}

    print("   ⛔ Denegado")
    raise HTTPException(status_code=401, detail="Correo no autorizado.")

@app.get("/alumnos")
def get_alumnos():
    try:
        df = read_excel_from_bytes(download_excel_bytes(blob_client_data))
        return {"count": len(df), "rows": df.fillna("").to_dict(orient="records")}
    except Exception as e:
        print(f"Error Azure: {e}")
        raise HTTPException(status_code=500, detail=f"Error cargando datos: {e}")

@app.post("/entregar")
def post_entregar(payload: EntregaRequest):
    if not (payload.folio or payload.rut):
        raise HTTPException(status_code=400, detail="Falta datos")
    try:
        df = read_excel_from_bytes(download_excel_bytes(blob_client_data))
        idx = find_row_index(df, folio=payload.folio, rut=payload.rut)
        if idx is None:
            raise HTTPException(status_code=404, detail="No encontrado")

        chile_tz = pytz.timezone('America/Santiago')
        fecha_entrega_chile = datetime.now(chile_tz).strftime("%Y-%m-%d %H:%M:%S")

        df.at[idx, 'EntregadoStatus'] = 'ENTREGADA'
        df.at[idx, 'Responsable'] = payload.responsable or df.at[idx, 'Responsable']
        df.at[idx, 'FechaEntrega'] = fecha_entrega_chile

        upload_excel_bytes(blob_client_data, df_to_excel_bytes(df))
        return {"status": "ok", "updated": df.loc[idx].fillna("").to_dict()}
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error entrega: {e}")

@app.get("/dashboard/stats")
def get_dashboard_stats():
    try:
        df = read_excel_from_bytes(download_excel_bytes(blob_client_data))
        
        total_registros = len(df)
        entregados = df[df['EntregadoStatus'] == 'ENTREGADA'].shape[0]
        pendientes = total_registros - entregados

        chile_tz = pytz.timezone('America/Santiago')
        hoy_fecha = datetime.now(chile_tz).date()
        
        entregados_hoy = 0
        historial_entregas = []
        ranking_responsables = []

        if 'Responsable' in df.columns and 'EntregadoStatus' in df.columns:
            df_entregadas = df[df['EntregadoStatus'] == 'ENTREGADA'].copy()
            df_entregadas['Responsable'] = df_entregadas['Responsable'].astype(str).str.upper().str.strip()
            df_entregadas = df_entregadas[~df_entregadas['Responsable'].isin(['NAN', 'NONE', '', 'BLANK'])]
            conteo_resp = df_entregadas['Responsable'].value_counts().head(5)
            ranking_responsables = [{"nombre": str(n), "cantidad": int(c)} for n, c in conteo_resp.items()]

        if 'FechaEntrega' in df.columns:
            df['FechaEntrega'] = df['FechaEntrega'].astype(str).str.strip()
            df.loc[df['FechaEntrega'].str.lower().isin(['nan', 'nat', 'none', '']), 'FechaEntrega'] = None
            fechas_dt = pd.to_datetime(df['FechaEntrega'], errors='coerce', dayfirst=True)
            entregados_hoy = df[fechas_dt.dt.date == hoy_fecha].shape[0]

            fechas_validas = fechas_dt.dropna()
            fecha_limite = hoy_fecha - timedelta(days=30)
            fechas_ultimo_mes = fechas_validas[fechas_validas.dt.date >= fecha_limite]
            
            conteo_diario = fechas_ultimo_mes.dt.date.value_counts().sort_index()
            historial_entregas = [{"fecha": str(f), "cantidad": int(c)} for f, c in conteo_diario.items()]

        return {
            "status": "ok",
            "total_registros": total_registros,
            "entregados_total": entregados,
            "pendientes_total": pendientes,
            "entregados_hoy": entregados_hoy,
            "porcentaje_entregado": round((entregados / total_registros * 100), 1) if total_registros > 0 else 0,
            "historial": historial_entregas,
            "ranking": ranking_responsables
        }

    except Exception as e:
        print(f"Error Dashboard: {e}")
        raise HTTPException(status_code=500, detail=f"Error stats: {e}")

# --- NUEVO ENDPOINT PARA DESCARGA ---
@app.get("/download-excel")
def download_excel_endpoint():
    """Descarga el archivo Excel actual directamente desde Azure."""
    try:
        # 1. Descargar bytes desde Azure
        excel_bytes = download_excel_bytes(blob_client_data)
        
        # 2. Convertir a stream para que FastAPI lo envíe
        data_stream = io.BytesIO(excel_bytes)
        
        # 3. Retornar como archivo adjunto
        return StreamingResponse(
            data_stream,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=Reporte_TNE_Completo.xlsx"}
        )
    except Exception as e:
        print(f"Error descarga: {e}")
        raise HTTPException(status_code=500, detail=f"No se pudo descargar el archivo: {e}")

# ---------------------------
# Ejecución Principal
# ---------------------------
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "127.0.0.1")
    print(f"🚀 Servidor Local + Azure corriendo en http://{host}:{port}")
    uvicorn.run(app, host=host, port=port)