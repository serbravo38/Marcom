import React, { useEffect, useState } from "react";
import { weatherService, type WeatherData } from "../services/weather";
import { getLocationCoordinates } from "../utils/coordinates";
import { Sun, Moon, Cloud, CloudSun, CloudRain, CloudLightning } from "lucide-react";

interface LocationWeatherBadgeProps {
  comuna?: string | null;
  region?: string | null;
  ubicacionId?: string;
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

    return () => {
      isMounted = false;
    };
  }, [comuna, region, ubicacionId]);

  if (loading) {
    return <span className="location-weather-badge loading">···</span>;
  }

  if (!weather) return null;

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
