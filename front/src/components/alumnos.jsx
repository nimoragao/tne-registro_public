import React, { useEffect, useState } from "react";
import axios from "axios";

function Alumnos() {
  const [alumnos, setAlumnos] = useState([]);
  const [search, setSearch] = useState("");
  const [responsable, setResponsable] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchAlumnos = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://127.0.0.1:8000/alumnos");
      setAlumnos(res.data.rows);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAlumnos();
  }, []);

  const handleEntregar = async (folio, rut) => {
    if (!responsable) {
      alert("Ingrese el responsable que entrega");
      return;
    }
    try {
      const payload = { folio, rut, responsable };
      const res = await axios.post("http://127.0.0.1:8000/entregar", payload);
      alert("Marcado como entregado ✅");
      fetchAlumnos(); // actualizar tabla
    } catch (err) {
      console.error(err);
      alert("Error al marcar como entregado");
    }
  };

  const filtered = alumnos.filter((a) => {
    const term = search.toLowerCase();
    return (
      (a.folio && a.folio.toLowerCase().includes(term)) ||
      (a.rut && a.rut.toLowerCase().includes(term))
    );
  });

  return (
    <div style={{ padding: "20px" }}>
      <h2>Alumnos</h2>
      <input
        type="text"
        placeholder="Buscar por folio o RUT"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: "10px", display: "block" }}
      />
      <input
        type="text"
        placeholder="Responsable de la entrega"
        value={responsable}
        onChange={(e) => setResponsable(e.target.value)}
        style={{ marginBottom: "10px", display: "block" }}
      />
      {loading ? (
        <p>Cargando...</p>
      ) : (
        <table border="1" cellPadding="5" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>Folio</th>
              <th>RUT</th>
              <th>Nombre</th>
              <th>Entregado</th>
              <th>Fecha Entrega</th>
              <th>Responsable</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, i) => (
              <tr key={i}>
                <td>{a.folio || "-"}</td>
                <td>{a.rut || "-"}</td>
                <td>{a.nombre || "-"}</td>
                <td>{a.entregado ? "✅" : "❌"}</td>
                <td>{a["fecha entrega"] || "-"}</td>
                <td>{a.responsable || "-"}</td>
                <td>
                  {!a.entregado && (
                    <button onClick={() => handleEntregar(a.folio, a.rut)}>
                      Marcar Entregado
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Alumnos;
