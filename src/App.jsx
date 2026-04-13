// src/App.jsx
import { useState } from "react";
import "./App.css";
import Map from "./components/Map.jsx";
import SismoPanel from "./components/SismoPanel.jsx";

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

      //-- avr si recuerdo mandar esto al css despues xd
      {resultado && (
        <div style={{
          padding: "16px 24px", background: "#242424",
          borderTop: "1px solid #e0e0e0", display: "flex", gap: "32px"
        }}>
          <span>Riesgo: <strong>{resultado.modelo_ml.nivel_riesgo}</strong></span>
          <span>Víctimas est.: <strong>{resultado.modelo_ml.victimas_estimadas}</strong></span>
          <span>Sin hogar: <strong>{resultado.personas_sin_hogar}</strong></span>
          <span>Costo: <strong>${resultado.formulas.costos_mxn?.toLocaleString("es-MX")} MXN</strong></span>
        </div>
      )}
    </div>
  );
}

export default App;