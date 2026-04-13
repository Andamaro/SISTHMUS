import { useState, useCallback } from "react";

//este hook es el que se encarga de obtener la posición del usuario
export function useGeolocation() {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setError("El navegador no soporta geolocalización.");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLoading(false);
      },
      (err) => {
        const messages = {
          1: "Permiso de ubicación denegado.",
          2: "Posición no disponible.",
          3: "Tiempo de espera agotado.",
        };
        setError(messages[err.code] || "Error desconocido.");
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  return { position, error, loading, locate };
}