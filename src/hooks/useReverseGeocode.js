import { useState, useCallback } from "react";

export function useReverseGeocode() {
  const [lugar, setLugar] = useState(null);
  const [cargando, setCargando] = useState(false);

  const geocodificar = useCallback(async (lat, lng) => {
    setCargando(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`
      );
      const data = await res.json();
      setLugar({
        nombre: data.address?.city
          || data.address?.town
          || data.address?.village
          || data.address?.municipality
          || "Ubicación seleccionada",
        estado: data.address?.state || "",
        lat: lat.toFixed(4),
        lng: lng.toFixed(4),
      });
    } catch {
      setLugar({ nombre: "Ubicación seleccionada", estado: "", lat: lat.toFixed(4), lng: lng.toFixed(4) });
    } finally {
      setCargando(false);
    }
  }, []);

  return { lugar, cargando, geocodificar };
}