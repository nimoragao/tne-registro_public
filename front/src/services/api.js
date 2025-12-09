// src/services/api.js
const BASE_URL = "http://localhost:8000"; // ajusta el puerto de FastAPI

export async function login(username, password) {
  // Si quieres login real, implementa aquí
  // Por ahora simulamos:
  return { token: "fake-token", user: username };
}

export async function getStudents() {
  const res = await fetch(`${BASE_URL}/alumnos`);
  if (!res.ok) throw new Error("Error al obtener alumnos");
  const data = await res.json();
  return data.rows;
}

export async function getStudentByFolio(folio) {
  const students = await getStudents();
  const student = students.find(s => s.folio?.toString() === folio);
  if (!student) throw new Error("No encontrado");
  return student;
}

export async function registerEntry(folio, rut, responsable = null) {
  const payload = { folio, rut, responsable };
  const res = await fetch(`${BASE_URL}/entregar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.detail || "Error al registrar");
  }

  const data = await res.json();
  return data.updated;
}
