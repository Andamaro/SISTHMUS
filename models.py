from sqlalchemy import Column, Integer, Float, String, DateTime, func, ForeignKey
from geoalchemy2 import Geometry
from database import Base

class Municipio(Base):
    __tablename__ = "municipios"

    id_municipio    = Column(Integer, primary_key=True, index=True)
    clave_inegi     = Column(String(10), unique=True)
    nombre          = Column(String(100))
    estado          = Column(String(50), default="Oaxaca")
    poblacion_total = Column(Integer)
    hab_viv         = Column(Float)
    pct_adobe       = Column(Float)
    tipo_suelo      = Column(String(2))
    vs30            = Column(Float)
    geometria       = Column(Geometry(geometry_type="MULTIPOLYGON", srid=4326))
    centroide       = Column(Geometry(geometry_type="POINT", srid=4326))
    creado_en       = Column(DateTime, server_default=func.now())

class SismoHistorico(Base):
    __tablename__ = "sismos_historicos"

    id_sismo       = Column(Integer, primary_key=True, index=True)
    fecha_hora     = Column(DateTime)
    magnitud       = Column(Float)
    profundidad_km = Column(Float)
    latitud        = Column(Float)
    longitud       = Column(Float)
    epicentro      = Column(Geometry(geometry_type="POINT", srid=4326))
    mmi            = Column(Integer)
    tipo_falla     = Column(String(20))
    fuente_datos   = Column(String(100), default="SSN")
    creado_en      = Column(DateTime, server_default=func.now())

class Simulacion(Base):
    __tablename__ = "simulaciones"

    id_simulaciones        = Column(Integer, primary_key=True, index=True)
    id_municipio           = Column(Integer, ForeignKey("municipios.id_municipio"))
    id_sismo               = Column(Integer, ForeignKey("sismos_historicos.id_sismo"))
    nvivu                  = Column(Integer)
    nvivm                  = Column(Integer)
    pc                     = Column(Float)
    pe                     = Column(Float)
    hab_viv                = Column(Float)
    c                      = Column(Integer)
    m1                     = Column(Float)
    m2                     = Column(Float)
    m3                     = Column(Float)
    m4                     = Column(Float)
    m5                     = Column(Float)
    viviendas_inhabitables = Column(Integer)
    personas_sin_hogar     = Column(Integer)
    victimas_ki            = Column(Integer)
    creado_en              = Column(DateTime, server_default=func.now())