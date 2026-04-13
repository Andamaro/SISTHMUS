import { useRef, useEffect } from "react";
import { useGeolocation } from "../hooks/useGeolocation.js";
import { useReverseGeocode } from "../hooks/useReverseGeocode.js";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./Map.css";

export default function Map({ onLugarSeleccionado }) {
  const mapRef = useRef();
  const mapInstanceRef = useRef();
  const markerRef = useRef(null);
  const clickMarkerRef = useRef(null);

  const { position, error, loading, locate } = useGeolocation();
  const { geocodificar } = useReverseGeocode();

  useEffect(() => {
    if (mapInstanceRef.current) return;

    mapInstanceRef.current = L.map(mapRef.current).setView(
      [17.0669, -96.7203], 8 
    );

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapInstanceRef.current);

    mapInstanceRef.current.on("click", async (e) => {
      const { lat, lng } = e.latlng;

      if (clickMarkerRef.current) {
        clickMarkerRef.current.remove();
      }

      clickMarkerRef.current = L.marker([lat, lng])
        .addTo(mapInstanceRef.current)
        .bindPopup("Cargando ubicación...")
        .openPopup();

      const lugar = await geocodificarYNotificar(lat, lng);
      if (lugar && clickMarkerRef.current) {
        clickMarkerRef.current
          .getPopup()
          .setContent(`<b>${lugar.nombre}</b><br>${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        clickMarkerRef.current.openPopup();
      }
    });

    return () => {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const geocodificarYNotificar = async (lat, lng) => {

    onLugarSeleccionado({
      nombre: "Cargando...",
      estado: "",
      lat: lat.toFixed(4),
      lng: lng.toFixed(4),
      municipio: null,
    });

    try {
      const [geoRes, municipioRes] = await Promise.allSettled([
        fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`,
        ).then((r) => r.json()),
        fetch(`http://127.0.0.1:8000/api/municipio?lat=${lat}&lng=${lng}`).then(
          (r) => r.json(),
        ),
      ]);

      const geo = geoRes.status === "fulfilled" ? geoRes.value : null;
      const nombre =
        geo?.address?.city ||
        geo?.address?.town ||
        geo?.address?.village ||
        geo?.address?.municipality ||
        geo?.address?.county ||
        "Ubicación seleccionada";
      const estado = geo?.address?.state || "";

      const mun =
        municipioRes.status === "fulfilled" ? municipioRes.value : null;
      const municipio = mun?.encontrado ? mun : null;
      
      //-- por si se me olvida algo lo dejo aqui :p
      const lugar = {
        nombre,
        estado,
        lat: lat.toFixed(4),
        lng: lng.toFixed(4),
        municipio,
      };

      onLugarSeleccionado(lugar);

      // solo es el cosito visual :p
      if (clickMarkerRef.current) {
        clickMarkerRef.current
          .getPopup()
          .setContent(
            `<b>${nombre}</b><br>${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          );
        clickMarkerRef.current.openPopup();
      }

      return lugar;
    } catch (err) {
      console.error("Error geocodificando:", err);
      const lugar = {
        nombre: "Ubicación seleccionada",
        estado: "",
        lat: lat.toFixed(4),
        lng: lng.toFixed(4),
        municipio: null,
      };
      onLugarSeleccionado(lugar);
      return lugar;
    }
  };

  //-- mostrar la ubicacion del usuario, quiza lo borre despues, al final ya no lo ocupamos...
  useEffect(() => {
    if (!position || !mapInstanceRef.current) return;
    const { lat, lng, accuracy } = position;
    if (markerRef.current) markerRef.current.remove();
    markerRef.current = L.marker([lat, lng])
      .addTo(mapInstanceRef.current)
      .bindPopup(`Posicion actual<br>Precisión: ~${Math.round(accuracy)} m`)
      .openPopup();
    mapInstanceRef.current.setView([lat, lng], 12);
  }, [position]);

  return (
    <div className="map-container">
      <div ref={mapRef} className="map-view" />
      <button onClick={locate} disabled={loading} className="map-locate-btn">
        {loading ? "Localizando…" : "Mostrar ubicacion"}
      </button>
      {error && <div className="map-error">{error}</div>}
    </div>
  );
}