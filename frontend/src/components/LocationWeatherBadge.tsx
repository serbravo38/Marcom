/**
 * @file LocationWeatherBadge.tsx
 * @description Componente micro-insignia para renderizar el clima local en tiempo real
 * dentro de celdas de tablas (ej. Inventario de Locales) y tarjetas compactas.
 * 
 * Patrón de Arquitectura:
 * - Prevención de Fugas de Estado (isMounted pattern): Cuando el usuario pagina o filtra
 *   la tabla de inventario a gran velocidad, los componentes de fila se montan y desmontan
 *   rápidamente. Se utiliza una bandera booleana `isMounted` dentro de `useEffect` para
 *   asegurar que las resoluciones de promesas asíncronas no intenten ejecutar `setWeather`
 *   en componentes ya desmontados, evitando advertencias de React y fugas de memoria.
 * - Eficiencia de Caché: Aunque la tabla despliegue decenas de filas simultáneamente,
 *   aquellos locales situados en la misma comuna o área geográfica reutilizan instantáneamente
 *   la misma respuesta almacenada en la caché de `weatherService`.
 */

import React, { useEffect, useState } from "react";
import { weatherService, type WeatherData } from "../services/weather";
import { getLocationCoordinates } from "../utils/coordinates";
import { Sun, Moon, Cloud, CloudSun, CloudRain, CloudLightning } from "lucide-react";

interface LocationWeatherBadgeProps {
  /** Nombre de la comuna registrada del local */
  comuna?: string | null;
  /** Región administrativa a la que pertenece */
  region?: string | null;
  /** Identificador único del local para el cálculo de coordenadas */
  ubicacionId?: string;
  /** Si es true, despliega el texto de condición además de la temperatura */
  showDetails?: boolean;
}

export const LocationWeatherBadge: React.FC<LocationWeatherBadgeProps> = ({
  comuna,
  region,
  ubicacionId,
  showDetails = false
}) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const coords = getLocationCoordinates(comuna, region, ubicacionId || "");
    
    // Consulta al servicio meteorológico (aprovecha la capa de caché L1/L2)
    weatherService.getWeather(coords.lat, coords.lng)
      .then((data) => {
        if (isMounted) {
          setWeather(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    // Limpieza al desmontar o al cambiar de local
    return () => {
      isMounted = false;
    };
  }, [comuna, region, ubicacionId]);

  // Estado de carga compacto mientras se resuelve la promesa
  if (loading) {
    return <span className="location-weather-badge loading">···</span>;
  }

  if (!weather) return null;

  /**
   * Mapeo semántico de iconos para renderizado en dimensiones reducidas (12px).
   */
  const renderIcon = (type: WeatherData["iconType"]) => {
    switch (type) {
      case "sun":
        return <Sun size={12} style={{ color: "#facc15" }} />;
      case "moon":
        return <Moon size={12} style={{ color: "#38bdf8" }} />;
      case "cloud-sun":
        return <CloudSun size={12} style={{ color: "#38bdf8" }} />;
      case "cloud":
        return <Cloud size={12} style={{ color: "#94a3b8" }} />;
      case "rain":
        return <CloudRain size={12} style={{ color: "#60a5fa" }} />;
      case "thunder":
        return <CloudLightning size={12} style={{ color: "#f59e0b" }} />;
      default:
        return <Sun size={12} style={{ color: "#facc15" }} />;
    }
  };

  return (
    <div 
      className="location-weather-badge"
      title={`Clima en ${comuna || "local"}: ${weather.conditionText}, Humedad ${weather.humidity}%, Viento ${weather.windSpeed} km/h`}
    >
      {renderIcon(weather.iconType)}
      <span className="loc-temp">{weather.temperature}°C</span>
      {showDetails && (
        <span className="loc-cond">{weather.conditionText}</span>
      )}
    </div>
  );
};
