import React, { useEffect, useState } from "react";

const Dashboard = () => {
  const [alumnos, setAlumnos] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const userEmail = localStorage.getItem("user_email");

  const fetchAlumnos = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/alumnos");
      const data = await res.json();
      setAlumnos(data.rows || []);
    } catch (err) {
      console.error(err);
      alert("Error al cargar los alumnos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlumnos();
  }, []);

  const handleEntregar = async (folio, rut) => {
    if (!userEmail) {
      alert("No hay usuario logueado");
      return;
    }
    setUpdating(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/entregar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folio, rut, responsable: userEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Marcado como entregado: ${folio || rut}`);
        fetchAlumnos();
      } else {
        alert("Error: " + data.detail);
      }
    } catch (err) {
      console.error(err);
      alert("Error al actualizar registro");
    } finally {
      setUpdating(false);
    }
  };

  const filtered = alumnos.filter((a) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (a.folio && a.folio.toString().toLowerCase().includes(term)) ||
      (a.rut && a.rut.toString().toLowerCase().includes(term))
    );
  });

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Dashboard TNE</h2>
      <input
        type="text"
        placeholder="Buscar por folio o RUT"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: "1rem", width: "100%", padding: "0.5rem" }}
      />
      {loading ? (
        <p>Cargando...</p>
      ) : (
        <table border={1} cellPadding={5} style={{ width: "100%" }}>
          <thead>
            <tr>
              {Object.keys(alumnos[0] || {}).map((key) => (
                <th key={key}>{key}</th>
              ))}
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, idx) => {
              const entregado = a.ENTREGADO || a.entregado || false;
              return (
                <tr
                  key={idx}
                  style={{
                    backgroundColor: entregado ? "#d4edda" : "transparent",
                  }}
                >
                  {Object.keys(a).map((key) => (
                    <td key={key}>{a[key]}</td>
                  ))}
                  <td>
                    {!entregado && (
                      <button
                        disabled={updating}
                        onClick={() => handleEntregar(a.folio, a.rut)}
                      >
                        Marcar entregado
                      </button>
                    )}
                    {entregado && <span>✅ {a.RESPONSABLE || a.responsable}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Dashboard;
