import os
from azure.storage.blob import BlobServiceClient
from dotenv import load_dotenv
import pandas as pd

# Cargar variables de entorno
load_dotenv()

AZURE_ACCOUNT_NAME = os.getenv("AZURE_ACCOUNT_NAME")
AZURE_CONTAINER_NAME = os.getenv("AZURE_CONTAINER_NAME")
AZURE_SAS_TOKEN = os.getenv("AZURE_SAS_TOKEN")
EXCEL_BLOB_NAME = os.getenv("EXCEL_BLOB_NAME")
LOCAL_FILE = os.getenv("LOCAL_FILE", "data_local.xlsx")

# Crear cliente de Blob
blob_service_client = BlobServiceClient(
    account_url=f"https://{AZURE_ACCOUNT_NAME}.blob.core.windows.net",
    credential=AZURE_SAS_TOKEN
)

# Obtener contenedor y blob
container_client = blob_service_client.get_container_client(AZURE_CONTAINER_NAME)
blob_client = container_client.get_blob_client(EXCEL_BLOB_NAME)

# Descargar blob a archivo local
with open(LOCAL_FILE, "wb") as f:
    download_stream = blob_client.download_blob()
    f.write(download_stream.readall())

print(f"Archivo descargado correctamente como {LOCAL_FILE}")

# Leer Excel con pandas para verificar
df = pd.read_excel(LOCAL_FILE)
print("Primeras filas del Excel:")
print(df.head())
