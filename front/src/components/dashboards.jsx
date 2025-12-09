import React, { useEffect, useState, useMemo } from "react";

// URL del Backend
const API_URL = "https://tne-registro.onrender.com";

export default function Dashboard() {
  const [alumnos, setAlumnos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [responsable, setResponsable] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // --- LÓGICA DE CARGA ---
  const fetchAlumnos = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${API_URL}/alumnos`);
      if (!res.ok) throw new Error("No se pudo conectar con el servidor.");
      const data = await res.json();
      setAlumnos(data.rows || []);
    } catch (err) {
      setError("Error al cargar los datos. Verifica el backend.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlumnos();
  }, []);

  // --- LÓGICA DE ENTREGA ---
  const marcarEntregado = async (folio, rut) => {
    if (!responsable.trim()) {
      setError("⚠️ Debes ingresar tu nombre como responsable arriba.");
      setTimeout(() => setError(null), 4000);
      return;
    }
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_URL}/entregar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folio, rut, responsable }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(`✅ ¡Entrega registrada para ${data.updated["NOMBRE COMPLETO"]}!`);
        setAlumnos((prev) =>
          prev.map((a) =>
            a.Folio === data.updated.Folio || a.RUT === data.updated.RUT
              ? { ...a, ...data.updated }
              : a
          )
        );
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(`Error: ${data.detail || "Desconocido"}`);
      }
    } catch (error) {
      console.error(error);
      setError("Error de conexión.");
    }
  };

  // --- LÓGICA DE FILTRADO ---
  const filtrados = useMemo(() => {
    const term = busqueda.toLowerCase();
    return alumnos.filter(
      (a) =>
        (a.Folio && a.Folio.toLowerCase().includes(term)) ||
        (a.RUT && a.RUT.toLowerCase().includes(term)) || 
        (a["NOMBRE COMPLETO"] && a["NOMBRE COMPLETO"].toLowerCase().includes(term))
    );
  }, [alumnos, busqueda]);

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", backgroundColor: "#f3f4f6", minHeight: "100vh", padding: "40px 20px", color: "#1f2937" }}>
      
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        
        {/* === HEADER CARD === */}
        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "24px" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px", marginBottom: "24px" }}>
            <div>
              <h1 style={{ fontSize: "1.8rem", fontWeight: "700", color: "#111827", margin: "0 0 5px 0" }}>🎓 Panel de Entregas TNE</h1>
              <p style={{ color: "#6b7280", margin: 0 }}>Gestiona las entregas y registra responsables.</p>
            </div>
            
            {/* MENSAJES FLOTANTES */}
            <div style={{ minHeight: "40px" }}>
               {loading && <span style={{ color: "#2563eb", fontWeight: "600" }}>Cargando datos...</span>}
               {error && <span style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "8px 12px", borderRadius: "6px", border: "1px solid #fca5a5" }}>{error}</span>}
               {success && <span style={{ backgroundColor: "#dcfce7", color: "#166534", padding: "8px 12px", borderRadius: "6px", border: "1px solid #86efac" }}>{success}</span>}
            </div>
          </div>

          {/* INPUTS GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
            
            {/* BUSCADOR */}
            <div style={{ position: "relative" }}>
              {/* ICONO CON ESTILO INLINE PARA EVITAR QUE SEA GIGANTE */}
              <svg 
                style={{ width: "20px", height: "20px", position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar por nombre, folio o RUT..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{
                  width: "100%", padding: "12px 12px 12px 40px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "0.95rem", outline: "none", boxSizing: "border-box"
                }}
              />
            </div>

            {/* RESPONSABLE */}
            <div style={{ position: "relative" }}>
              <svg 
                style={{ width: "20px", height: "20px", position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <input
                type="text"
                placeholder="Nombre del Responsable (Obligatorio)"
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                style={{
                  width: "100%", padding: "12px 12px 12px 40px", borderRadius: "8px", 
                  border: !responsable ? "1px solid #fcd34d" : "1px solid #d1d5db", 
                  fontSize: "0.95rem", outline: "none", boxSizing: "border-box",
                  boxShadow: !responsable ? "0 0 0 2px rgba(251, 191, 36, 0.2)" : "none"
                }}
              />
            </div>
          </div>
        </div>

        {/* === TABLA === */}
        <div style={{ backgroundColor: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
              <thead style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <tr>
                  {["Folio", "RUT", "DV", "Guía", "N° Guía", "Nombre", "Estado", "Responsable", "Fecha", "Acción"].map((head) => (
                    <th key={head} style={{ padding: "16px", textAlign: "left", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", color: "#6b7280", letterSpacing: "0.05em" }}>
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.length > 0 ? (
                  filtrados.map((a, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "14px 16px", fontSize: "0.9rem", fontWeight: "600", color: "#374151" }}>{a.Folio || "-"}</td>
                      <td style={{ padding: "14px 16px", fontSize: "0.9rem", color: "#4b5563" }}>{a.RUT || "-"}</td>
                      <td style={{ padding: "14px 16px", fontSize: "0.9rem", color: "#4b5563" }}>{a.DigitoVerificador || "-"}</td>
                      <td style={{ padding: "14px 16px", fontSize: "0.9rem", color: "#4b5563" }}>{a.GuiaDespacho || "-"}</td>
                      <td style={{ padding: "14px 16px", fontSize: "0.9rem", color: "#4b5563" }}>{a.NumeroGuia || "-"}</td>
                      <td style={{ padding: "14px 16px", fontSize: "0.9rem", fontWeight: "600", color: "#111827" }}>{a["NOMBRE COMPLETO"]}</td>
                      
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ 
                          padding: "4px 10px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase",
                          backgroundColor: a.EntregadoStatus === "ENTREGADA" ? "#dcfce7" : "#fef3c7",
                          color: a.EntregadoStatus === "ENTREGADA" ? "#15803d" : "#b45309"
                        }}>
                          {a.EntregadoStatus === "ENTREGADA" ? "Entregada" : "Pendiente"}
                        </span>
                      </td>

                      <td style={{ padding: "14px 16px", fontSize: "0.9rem", textTransform: "capitalize", color: "#4b5563" }}>
                        {a.Responsable ? a.Responsable.toLowerCase() : "-"}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "0.9rem", color: "#6b7280" }}>
                        {a.FechaEntrega ? a.FechaEntrega.split(" ")[0] : "-"}
                      </td>
                      
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        {a.EntregadoStatus !== "ENTREGADA" ? (
                          <button
                            onClick={() => marcarEntregado(a.Folio, a.RUT)}
                            style={{
                              backgroundColor: "#2563eb", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", 
                              fontSize: "0.85rem", fontWeight: "600", cursor: "pointer", transition: "background 0.2s"
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#1d4ed8"}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#2563eb"}
                          >
                            Marcar
                          </button>
                        ) : (
                          <span style={{ color: "#9ca3af", fontSize: "0.85rem", fontStyle: "italic", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "5px" }}>
                            <svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Listo
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} style={{ padding: "60px", textAlign: "center", color: "#9ca3af" }}>
                        <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>🔍</div>
                        <p>No se encontraron alumnos.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "12px 24px", backgroundColor: "#f9fafb", textAlign: "right", fontSize: "0.8rem", color: "#6b7280", borderTop: "1px solid #e5e7eb" }}>
             Mostrando {filtrados.length} registros
          </div>
        </div>

      </div>
    </div>
  );
}