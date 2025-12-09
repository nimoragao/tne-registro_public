# services/excel_handler.py
import io
import pandas as pd
from datetime import datetime

# lee bytes del excel y devuelve DataFrame normalizado
def read_excel_from_bytes(bytes_data: bytes) -> pd.DataFrame:
    bio = io.BytesIO(bytes_data)
    # pandas detecta el engine
    df = pd.read_excel(bio, dtype=str, engine="openpyxl")
    # Normalizar encabezados: strip y lower / quitar espacios múltiples
    df.columns = [str(c).strip() for c in df.columns]
    return df

# convierte DataFrame a bytes de excel
def df_to_excel_bytes(df: pd.DataFrame) -> bytes:
    bio = io.BytesIO()
    with pd.ExcelWriter(bio, engine="openpyxl") as writer:
        df.to_excel(writer, index=False)
    bio.seek(0)
    return bio.read()

# buscar fila por folio o rut (case-insensitive)
def find_row_index(df: pd.DataFrame, folio: str = None, rut: str = None):
    if folio:
        matches = df[df.apply(lambda r: str(r).strip() == folio if False else False, axis=1)]
    # Implementamos búsquedas seguras:
    if folio:
        col_candidates = [c for c in df.columns if c.lower().replace(" ", "") in ("folio","n°defolio","n°defolio","nfolio","n°defolio")]
        if col_candidates:
            col = col_candidates[0]
            idx = df.index[df[col].astype(str).str.strip() == str(folio).strip()]
            if len(idx) > 0:
                return idx[0], col
    if rut:
        col_candidates = [c for c in df.columns if c.lower().replace(" ", "") in ("rut","rut")]
        if col_candidates:
            col = col_candidates[0]
            idx = df.index[df[col].astype(str).str.strip() == str(rut).strip()]
            if len(idx) > 0:
                return idx[0], col
    return None, None

# marcar como entregado y devolver bytes nuevos
def mark_entregado_and_serialize(bytes_data: bytes, folio: str = None, rut: str = None, responsable: str = None):
    df = read_excel_from_bytes(bytes_data)
    idx, matched_col = find_row_index(df, folio=folio, rut=rut)
    if idx is None:
        return None, None  # no encontrado
    # identificar columnas target (Entregado, Fecha entrega, Responsable) con nombres flexibles
    col_entregado = next((c for c in df.columns if c.lower().replace(" ", "") in ("entregado","entregad")), None)
    col_fecha = next((c for c in df.columns if c.lower().replace(" ", "") in ("fechaentrega","fecha","fecha_de_entrega")), None)
    col_resp = next((c for c in df.columns if c.lower().replace(" ", "") in ("responsable","encargado")), None)

    # si no existen, los creamos
    if col_entregado is None:
        col_entregado = "ENTREGADO"
        df[col_entregado] = ""
    if col_fecha is None:
        col_fecha = "FECHA ENTREGA"
        df[col_fecha] = ""
    if col_resp is None:
        col_resp = "RESPONSABLE"
        df[col_resp] = ""

    df.at[idx, col_entregado] = True
    df.at[idx, col_fecha] = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    if responsable:
        df.at[idx, col_resp] = responsable

    new_bytes = df_to_excel_bytes(df)
    # devolver la fila actualizada como dict
    updated_row = df.loc[idx].to_dict()
    return new_bytes, updated_row
