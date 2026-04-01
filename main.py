from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from database import get_db, engine
import models
import joblib
import pandas as pd

# Cargar modelos ML
modelo_victimas = joblib.load("modelos/modelo_victimas.pkl")
modelo_dano     = joblib.load("modelos/modelo_dano.pkl")
modelo_riesgo   = joblib.load("modelos/modelo_riesgo.pkl")


# Constantes económicas (fuente: CONAVI / CENAPRED 2024)
COSTO_M2_RECONSTRUCCION = 8500      # MXN por m² promedio Oaxaca
SUPERFICIE_PROMEDIO_M2 = 45         # m² promedio vivienda rural Oaxaca
COSTO_ALBERGUE_DIA = 185            # MXN por persona por día
DIAS_ALBERGUE_ESTIMADOS = 90        # 3 meses promedio post-sismo
VALOR_ESTADISTICO_VIDA = 2500000    # MXN por víctima (VEV CENAPRED)

models.Base.metadata.create_all(bind=engine)
app = FastAPI()

@app.get("/ping")
def ping():
    return {"mensaje": "el servidor funciona"}

@app.post("/api/estimar")
def estimar(datos: dict, db: Session = Depends(get_db)):
    Nvivu   = datos["Nvivu"]
    Nvivm   = datos["Nvivm"]
    PC      = datos["PC"]
    PE      = datos["PE"]
    hab_viv = datos["hab_viv"]
    C       = datos["C"]
    M1      = datos["M1"]
    M2      = datos["M2"]
    M3      = datos["M3"]
    M4      = datos["M4"]
    M5      = datos["M5"]

    viviendas_inhabitables = Nvivu * PC + Nvivm * PC + Nvivm * PE * 0.9
    personas_sin_hogar     = viviendas_inhabitables * hab_viv
    victimas_ki            = C * M1 * M2 * M3 * (M4 + M5 * (1 - M4))
    # Cálculo de costos económicos
    costo_viviendas = round(viviendas_inhabitables * COSTO_M2_RECONSTRUCCION * SUPERFICIE_PROMEDIO_M2)
    costo_albergue  = round(personas_sin_hogar * COSTO_ALBERGUE_DIA * DIAS_ALBERGUE_ESTIMADOS)
    costo_victimas  = round(victimas_ki * VALOR_ESTADISTICO_VIDA)
    costo_total     = costo_viviendas + costo_albergue + costo_victimas

    # Predicción ML
    sismo_input = pd.DataFrame([{
    'magnitud':            datos.get("magnitud", 0),
    'profundidad_km':      datos.get("profundidad_km", 0),
    'distancia_oaxaca_km': datos.get("distancia_oaxaca_km", 0)}])

    victimas_ml = round(modelo_victimas.predict(sismo_input)[0])
    dano_ml     = round(modelo_dano.predict(sismo_input)[0])
    riesgo_ml = modelo_riesgo.predict(sismo_input)[0]

    # Corrección por regla para casos extremos
    magnitud_val    = datos.get("magnitud", 0)
    distancia_val   = datos.get("distancia_oaxaca_km", 999)

    if magnitud_val >= 8.0 and distancia_val < 150:
        riesgo_ml = "alto"
    elif magnitud_val >= 7.5:
        riesgo_ml = "alto"
    elif magnitud_val <= 5.5 and riesgo_ml != "bajo":
        riesgo_ml = "bajo"

    registro = models.Simulacion(
    nvivu=Nvivu, nvivm=Nvivm, pc=PC, pe=PE, hab_viv=hab_viv,
    c=C, m1=M1, m2=M2, m3=M3, m4=M4, m5=M5,
    viviendas_inhabitables=round(viviendas_inhabitables),
    personas_sin_hogar=round(personas_sin_hogar),
    victimas_ki=round(victimas_ki)
)

    db.add(registro)
    db.commit()
    db.refresh(registro)

    return {
    "id": registro.id_simulaciones,
    "viviendas_inhabitables": registro.viviendas_inhabitables,
    "personas_sin_hogar": registro.personas_sin_hogar,
    "formulas": {
        "victimas_coburn_spence": registro.victimas_ki,
        "costos_mxn": costo_total
    },
    "modelo_ml": {
        "victimas_estimadas": victimas_ml,
        "dano_miles_usd": dano_ml,
        "nivel_riesgo": riesgo_ml
    }
}

@app.get("/api/historial")
def historial(db: Session = Depends(get_db)):
    simulaciones = db.query(models.Simulacion).all()
    return [
        {
            "id": s.id_simulaciones,
            "viviendas_inhabitables": s.viviendas_inhabitables,
            "personas_sin_hogar": s.personas_sin_hogar,
            "victimas_ki": s.victimas_ki,
            "creado_en": s.creado_en
        }
        for s in simulaciones
    ]    