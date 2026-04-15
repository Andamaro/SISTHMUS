import { useState } from "react";
import "./App.css";
import Map from "./components/Map.jsx";
import SismoPanel from "./components/PanelS.jsx";

function App() {
  const [lugar, setLugar] = useState(null);
  const [resultado, setResultado] = useState(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Map onLugarSeleccionado={setLugar} />
        <SismoPanel
          lugar={lugar}
          onResultado={({ resultado }) => setResultado(resultado)}
        />
      </div>

      {resultado && (
        <div className="resultados">
          <span>Riesgo sismico: <strong>{resultado.modelo_ml.nivel_riesgo}</strong></span>
          <span>Víctimas estimadas: <strong>{resultado.modelo_ml.victimas_estimadas}</strong></span>
          <span>Personas sin hogar: <strong>{resultado.personas_sin_hogar}</strong></span>
          <span>Costo total de los daños: <strong>${resultado.formulas.costos_mxn?.toLocaleString("es-MX")} MXN</strong></span>
        </div>
      )}
    </div>
  );
}

export default App;