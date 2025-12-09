// src/components/OCRScanner.jsx
import React, { useState } from "react";
import axios from "axios";

function OCRScanner() {
  const [folio, setFolio] = useState("");
  const [rut, setRut] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    try {
      const payload = { folio: folio || null, rut: rut || null, responsable: "Admin" };
      const res = await axios.post("http://localhost:8000/entregar", payload);
      setMessage(`TNE registrado: ${JSON.stringify(res.data.updated)}`);
      setFolio("");
      setRut("");
    } catch (err) {
      setMessage(err.response?.data?.detail || "Error desconocido");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Registrar TNE</h2>
      <input
        type="text"
        placeholder="Folio"
        value={folio}
        onChange={(e) => setFolio(e.target.value)}
        style={{ marginRight: "10px" }}
      />
      <input
        type="text"
        placeholder="RUT"
        value={rut}
        onChange={(e) => setRut(e.target.value)}
        style={{ marginRight: "10px" }}
      />
      <button onClick={handleSubmit}>Registrar</button>
      {message && <p>{message}</p>}
    </div>
  );
}

export default OCRScanner;
