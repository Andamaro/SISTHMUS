const API_URL = "http://127.0.0.1:8000";

export async function estimarRiesgo(datos) {
  const res = await fetch(`${API_URL}/api/estimar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

export async function obtenerHistorial() {
  const res = await fetch(`${API_URL}/api/historial`);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

export async function obtenerMunicipio(lat, lng) {
  const res = await fetch(
    `http://127.0.0.1:8000/api/municipio?lat=${lat}&lng=${lng}`
  );
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}