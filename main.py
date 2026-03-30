from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from database import get_db, engine
import models
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

@app.post("/api/simular")
def simular(datos: dict, db: Session = Depends(get_db)):
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
    "victimas_ki": registro.victimas_ki,
    "costos": {
        "reconstruccion_viviendas_mxn": costo_viviendas,
        "albergue_temporal_mxn": costo_albergue,
        "valor_vidas_humanas_mxn": costo_victimas,
        "total_estimado_mxn": costo_total
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