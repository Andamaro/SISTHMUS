import { useState, useEffect } from "react";
import { estimarRiesgo } from "../utils/api.js";
import "./SismoPanel.css";

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
    const distancia = calcularDistanciaOaxaca(
      parseFloat(lugar.lat),
      parseFloat(lugar.lng)
    );
    setForm((f) => ({ ...f, distancia_oaxaca_km: distancia }));
  }, [lugar]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.magnitud || !form.profundidad_km) {
      setError("Verifique que los campos de magnitud y profundidad estén completos");
      return;
    }
    setCargando(true);
    setError(null);

    try {
      const mun = lugar?.municipio;

      let datos;

      if (mun) {
        const pob = mun.poblacion_total;
        const adobe = mun.pct_adobe;
        const hab_viv = mun.hab_viv;

        const total_viviendas = Math.round(pob / hab_viv);

        const Nvivu = Math.round(total_viviendas * (1 - adobe));
        const Nvivm = Math.round(total_viviendas * adobe);

        const factor_suelo =
          { A: 0.8, B: 1.0, C: 1.3, D: 1.6 }[mun.tipo_suelo] ?? 1.0;

        const PC = Math.min(
          0.95,
          parseFloat((adobe * 0.6 * factor_suelo).toFixed(3)),
        );
        const PE = Math.min(
          0.95,
          parseFloat((adobe * 0.85 * factor_suelo).toFixed(3)),
        );

        const C = Math.round(pob * 0.7);

        const M1 = 0.8;
        const M2 = adobe > 0.5 ? 0.9 : 0.6;
        const M3 = mun.vs30 < 300 ? 0.9 : 0.6;
        const M4 = 0.4;
        const M5 = 0.5;

        datos = {
          Nvivu,
          Nvivm,
          PC,
          PE,
          hab_viv,
          C,
          M1,
          M2,
          M3,
          M4,
          M5,
          magnitud: parseFloat(form.magnitud),
          profundidad_km: parseFloat(form.profundidad_km),
          distancia_oaxaca_km: parseFloat(form.distancia_oaxaca_km),
        };
      } else {
        datos = {
          Nvivu: 1000,
          Nvivm: 500,
          PC: 0.3,
          PE: 0.6,
          hab_viv: 3.5,
          C: 200,
          M1: 0.8,
          M2: 0.7,
          M3: 0.6,
          M4: 0.4,
          M5: 0.5,
          magnitud: parseFloat(form.magnitud),
          profundidad_km: parseFloat(form.profundidad_km),
          distancia_oaxaca_km: parseFloat(form.distancia_oaxaca_km),
        };
      }

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
        <h3>Estimación de riesgo sísmico</h3>
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
          <span>El municipio no fue encontrado en la base de datos</span>
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
            placeholder="ej. 80" min="0" step="1"
          />
          <span className="panel__hint">Calculada automáticamente</span>
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