import { useState, useEffect } from "react";
import { estimarRiesgo } from "../utils/api.js";
import "./PanelS.css";

const clamp = (adobe, factor, coef) =>
  Math.min(0.95, parseFloat((adobe * coef * factor).toFixed(3)));

export default function SismoPanel({ lugar, onResultado }) {
  const [form, setForm] = useState({
    magnitud: "",
    profundidad_km: "",
    distancia_oaxaca_km: "",
  });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!lugar) return;
    setForm((f) => ({
      ...f,
      distancia_oaxaca_km: calcularDistanciaOaxaca(+lugar.lat, +lugar.lng),
    }));
  }, [lugar]);

  const handleChange = ({ target: { name, value } }) =>
    setForm((f) => ({ ...f, [name]: value }));

  const handleSubmit = async () => {
    if (!form.magnitud || !form.profundidad_km) {
      setError("Verifique que los campos de magnitud y profundidad estén completos");
      return;
    }
    setCargando(true);
    setError(null);

    try {
      const mun = lugar?.municipio;

      const { magnitud, profundidad_km, distancia_oaxaca_km } =
        Object.fromEntries(Object.entries(form).map(([k, v]) => [k, parseFloat(v)]));

      const adobe = mun?.pct_adobe ?? 0;
      const factor_suelo = { A: 0.8, B: 1.0, C: 1.3, D: 1.6 }[mun?.tipo_suelo] ?? 1.0;
      const total_viviendas = mun ? Math.round(mun.poblacion_total / mun.hab_viv) : 0;

      const datos = {
        Nvivu:               mun ? Math.round(total_viviendas * (1 - adobe)) : 1000,
        Nvivm:               mun ? Math.round(total_viviendas * adobe)        : 500,
        PC:                  mun ? clamp(adobe, factor_suelo, 0.6)            : 0.3,
        PE:                  mun ? clamp(adobe, factor_suelo, 0.85)           : 0.6,
        hab_viv:             mun?.hab_viv ?? 3.5,
        C:                   mun ? Math.round(mun.poblacion_total * 0.7)      : 200,
        M1: 0.8,
        M2:                  mun ? (adobe > 0.5 ? 0.9 : 0.6) : 0.7,
        M3:                  mun ? (mun.vs30 < 300 ? 0.9 : 0.6) : 0.6,
        M4: 0.4,
        M5: 0.5,
        magnitud,
        profundidad_km,
        distancia_oaxaca_km,
      };

      console.log("Datos enviados al backend:", datos);
      const resultado = await estimarRiesgo(datos);
      onResultado({ lugar, resultado });
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setCargando(false);
    }
  };

  if (!lugar) {
    return (
      <div className="panel panel--empty">
        <p>Selecciona un punto en el mapa para comenzar la estimación</p>
      </div>
    );
  }

  const mun = lugar?.municipio;

  return (
    <div className="panel">
      <div className="panel__header">
        <h3>Sisthmus</h3>
      </div>
      <div className="panel__location">
        <span className="panel__location-label">Ubicación seleccionada</span>
        <span className="panel__location-name">
          {lugar.nombre}{lugar.estado ? `, ${lugar.estado}` : ""}
        </span>
        <span className="panel__location-coords">
          {lugar.lat}° N, {lugar.lng}° W
        </span>
      </div>

      {mun ? (
        <div className="panel__municipio">
          <span className="panel__municipio-label">Datos del municipio</span>
          <div className="panel__municipio-grid">
            <div className="panel__municipio-item">
              <span>Población</span>
              <strong>{mun.poblacion_total?.toLocaleString("es-MX")}</strong>
            </div>
            <div className="panel__municipio-item">
              <span>Hab/vivienda</span>
              <strong>{mun.hab_viv}</strong>
            </div>
            <div className="panel__municipio-item">
              <span>% Adobe</span>
              <strong>{(mun.pct_adobe * 100).toFixed(0)}%</strong>
            </div>
            <div className="panel__municipio-item">
              <span>Tipo suelo</span>
              <strong>{mun.tipo_suelo || "—"}</strong>
            </div>
          </div>
        </div>
      ) : (
        <div className="panel__municipio panel__municipio--warn">
          <span>Texto de testeo: El municipio no fue encontrado en la base de datos local</span>
        </div>
      )}

      <div className="panel__form">
        <div className="panel__field">
          <label>Magnitud (Mw)</label>
          <input
            type="number" name="magnitud"
            value={form.magnitud} onChange={handleChange}
            placeholder="Por ejemplo: 7.0" min="1" max="10" step="0.1"
          />
          <span className="panel__hint">Escala de evento sísmico</span>
        </div>

        <div className="panel__field">
          <label>Profundidad (km)</label>
          <input
            type="number" name="profundidad_km"
            value={form.profundidad_km} onChange={handleChange}
            placeholder="Por ejemplo: 25" min="0" max="700" step="1"
          />
          <span className="panel__hint">Profundidad del hipocentro</span>
        </div>

        <div className="panel__field">
          <label>Distancia a Oaxaca (km)</label>
          <input
            type="number" name="distancia_oaxaca_km"
            value={form.distancia_oaxaca_km} onChange={handleChange}
            placeholder="Por ejemplo: 80" min="0" step="1"
          />
          <span className="panel__hint">Distancia del lugar seleccionado a oaxaca</span>
        </div>

        {error && <p className="panel__error">{error}</p>}
      </div>

      <div className="panel__footer">
        <button
          className="panel__btn"
          onClick={handleSubmit}
          disabled={cargando}
        >
          {cargando ? "Calculando..." : "Estimar riesgo"}
        </button>
      </div>
    </div>
  );
}

function calcularDistanciaOaxaca(lat, lng) {
  const OAXACA = { lat: 17.0669, lng: -96.7203 };
  const R = 6371;
  const dLat = ((lat - OAXACA.lat) * Math.PI) / 180;
  const dLng = ((lng - OAXACA.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((OAXACA.lat * Math.PI) / 180) *
    Math.cos((lat * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}