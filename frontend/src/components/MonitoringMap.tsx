import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { 
  Layers, 
  Maximize2, 
  Navigation, 
  MapPin, 
  Sun, 
  Moon, 
  Cloud, 
  CloudSun, 
  CloudRain, 
  CloudLightning,
  Droplets,
  Wind
} from "lucide-react";
import { type Ubicacion } from "../services/inventory";
import { getLocationCoordinates } from "../utils/coordinates";
import { weatherService, type WeatherData } from "../services/weather";
import { Link } from "react-router-dom";

interface MonitoringMapProps {
  locations: Ubicacion[];
  onSelectStation?: (loc: Ubicacion) => void;
  selectedStation?: Ubicacion | null;
}

export const MonitoringMap: React.FC<MonitoringMapProps> = ({
  locations,
  onSelectStation,
  selectedStation
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [activeStation, setActiveStation] = useState<Ubicacion | null>(null);
  const [stationWeather, setStationWeather] = useState<WeatherData | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Seleccionar la estación inicial o la provista por prop
  useEffect(() => {
    if (selectedStation) {
      setActiveStation(selectedStation);
    } else if (!activeStation && locations.length > 0) {
      const stgo = locations.find(
        (l) =>
          (l.comuna || "").toUpperCase().includes("SANTIAGO") ||
          (l.region || "").toUpperCase().includes("METROPOLITANA")
      );
      setActiveStation(stgo || locations[0]);
    }
  }, [locations, selectedStation]);

  // Cargar el clima de la estación activa seleccionada en tiempo real
  useEffect(() => {
    if (!activeStation) return;
    const coords = getLocationCoordinates(
      activeStation.comuna,
      activeStation.region,
      activeStation.ubicacion_id || activeStation.codigo_local || ""
    );
    weatherService.getWeather(coords.lat, coords.lng).then((w) => {
      setStationWeather(w);
    });
  }, [activeStation]);

  // Inicializar Leaflet Map con OpenStreetMap Oficial (100% abierto sin API Key ni marcas de agua)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centro inicial: Santiago de Chile
    const map = L.map(mapContainerRef.current, {
      center: [-33.4489, -70.6693],
      zoom: 11,
      zoomControl: false,
      attributionControl: false
    });

    // Control de zoom en la esquina superior izquierda
    L.control.zoom({ position: "topleft" }).addTo(map);

    // Attribution discreto abajo a la izquierda
    L.control
      .attribution({ position: "bottomleft", prefix: false })
      .addAttribution(
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
      )
      .addTo(map);

    // Capa de mosaicos oficial OpenStreetMap (Open Source, sin restricciones)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      subdomains: ["a", "b", "c"],
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    // Forzar recalculo de dimensiones del mapa una vez montado
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Renderizar y actualizar los marcadores de las estaciones con clima dinámico
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    locations.forEach((loc) => {
      const coords = getLocationCoordinates(
        loc.comuna,
        loc.region,
        loc.ubicacion_id || loc.codigo_local || ""
      );

      // Crear icono pulsante con estilo neón cian
      const isSelected = activeStation?.ubicacion_id === loc.ubicacion_id;
      const customIcon = L.divIcon({
        className: "custom-map-pin-container",
        html: `
          <div class="map-pulse-marker ${isSelected ? "selected" : ""}">
            <div class="map-pulse-ring"></div>
            <div class="map-pulse-core"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([coords.lat, coords.lng], { icon: customIcon });

      const popupContent = `
        <div class="leaflet-custom-popup">
          <div class="l-pop-badge">${loc.codigo_local || "LOCAL"}</div>
          <div class="l-pop-title">${loc.nombre}</div>
          <div class="l-pop-address">📍 ${loc.direccion}</div>
          <div class="l-pop-comuna">${loc.comuna || ""}, ${loc.region || ""}</div>
          
          <!-- Clima en vivo en el local -->
          <div id="popup-weather-${loc.ubicacion_id}" class="popup-weather-box">
            <span class="popup-weather-loading">Consultando clima en ${loc.comuna || "local"}...</span>
          </div>

          <div class="l-pop-footer">
            <span class="l-pop-screens">📺 ${loc.cantidad_pantallas || 3} Pantallas</span>
            <span class="l-pop-status">${loc.activo !== false ? "Operativo" : "Mantenimiento"}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: "marcom-leaflet-popup",
        closeButton: true,
        offset: [0, -10]
      });

      // Al abrir el popup, cargar el clima exacto de ese local desde Open-Meteo
      marker.on("popupopen", async () => {
        const weather = await weatherService.getWeather(coords.lat, coords.lng);
        const container = document.getElementById(`popup-weather-${loc.ubicacion_id}`);
        if (container) {
          container.innerHTML = `
            <div class="popup-weather-pill">
              <span class="popup-weather-temp">🌡️ ${weather.temperature}°C</span>
              <span class="popup-weather-desc">${weather.conditionText}</span>
              <span class="popup-weather-sub">💧 ${weather.humidity}% · 💨 ${weather.windSpeed} km/h</span>
            </div>
          `;
        }
      });

      marker.on("click", () => {
        setActiveStation(loc);
        if (onSelectStation) {
          onSelectStation(loc);
        }
      });

      marker.addTo(markersLayerRef.current!);
    });
  }, [locations, activeStation, onSelectStation]);

  // Centrar en Santiago
  const handleCenterSantiago = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([-33.4489, -70.6693], 11, {
      duration: 1.2
    });
  };

  // Ajustar vista para ver todas las estaciones de Chile
  const handleFitAllChile = () => {
    if (!mapInstanceRef.current || locations.length === 0) return;
    const latLngs: L.LatLngExpression[] = locations.map((loc) => {
      const c = getLocationCoordinates(
        loc.comuna,
        loc.region,
        loc.ubicacion_id || loc.codigo_local || ""
      );
      return [c.lat, c.lng];
    });
    const bounds = L.latLngBounds(latLngs);
    mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30] });
  };

  const renderWeatherIcon = (type?: WeatherData["iconType"]) => {
    switch (type) {
      case "sun":
        return <Sun size={15} style={{ color: "#facc15" }} />;
      case "moon":
        return <Moon size={15} style={{ color: "#38bdf8" }} />;
      case "cloud-sun":
        return <CloudSun size={15} style={{ color: "#38bdf8" }} />;
      case "cloud":
        return <Cloud size={15} style={{ color: "#94a3b8" }} />;
      case "rain":
        return <CloudRain size={15} style={{ color: "#60a5fa" }} />;
      case "thunder":
        return <CloudLightning size={15} style={{ color: "#f59e0b" }} />;
      default:
        return <Sun size={15} style={{ color: "#facc15" }} />;
    }
  };

  return (
    <div className="interactive-map-wrapper">
      {/* Barra superior de controles del mapa */}
      <div className="map-controls-toolbar">
        <div className="map-badge-count">
          <span className="live-pulse-dot"></span>
          <span>{locations.length} Estaciones en Red</span>
        </div>

        <div className="map-actions-group">
          <button
            type="button"
            className="map-tool-btn"
            onClick={handleCenterSantiago}
            title="Centrar en Región Metropolitana"
          >
            <Navigation size={13} />
            <span>Santiago</span>
          </button>

          <button
            type="button"
            className="map-tool-btn"
            onClick={handleFitAllChile}
            title="Ver todo Chile"
          >
            <Maximize2 size={13} />
            <span>Chile</span>
          </button>

          <button
            type="button"
            className="map-tool-btn"
            onClick={() => setIsDarkMode((prev) => !prev)}
            title="Alternar entre modo oscuro y mapa natural OpenStreetMap"
          >
            <Layers size={13} />
            <span>{isDarkMode ? "Oscuro" : "Claro"}</span>
          </button>
        </div>
      </div>

      {/* Contenedor del Mapa Leaflet OpenStreetMap */}
      <div
        ref={mapContainerRef}
        className={`leaflet-map-canvas ${isDarkMode ? "map-dark-tiles" : ""}`}
      />

      {/* Tarjeta flotante interactiva con la estación seleccionada y su clima en vivo */}
      {activeStation && (
        <div className="map-floating-station-card interactive animate-fade-in">
          <div className="station-card-top">
            <div className="station-card-icon-pill">
              <MapPin size={18} />
            </div>
            <div>
              <div className="station-card-title" title={activeStation.nombre}>
                {activeStation.nombre.length > 24
                  ? activeStation.nombre.substring(0, 23) + "..."
                  : activeStation.nombre}
              </div>
              <div className="station-status-pill">
                <span className="station-status-dot"></span>
                <span>
                  {activeStation.activo !== false ? "En operación" : "Mantenimiento"}
                </span>
                <span className="station-code-tag">
                  {activeStation.codigo_local || "EDS"}
                </span>
              </div>
            </div>
          </div>

          <div className="station-details-rows">
            <span>📺 Monitores: {activeStation.cantidad_pantallas || 3} activos</span>
            <span>📍 Comuna: {activeStation.comuna || "Santiago"}</span>
          </div>

          {/* Clima en vivo en el punto geográfico del local */}
          {stationWeather && (
            <div className="station-weather-mini-box">
              <div className="station-weather-top-row">
                <div className="station-weather-icon-temp">
                  {renderWeatherIcon(stationWeather.iconType)}
                  <span className="station-weather-temp">{stationWeather.temperature}°C</span>
                </div>
                <span className="station-weather-condition">{stationWeather.conditionText}</span>
              </div>
              <div className="station-weather-sub-metrics">
                <span title="Humedad relativa"><Droplets size={10} /> {stationWeather.humidity}%</span>
                <span title="Velocidad del viento"><Wind size={10} /> {stationWeather.windSpeed} km/h</span>
              </div>
            </div>
          )}

          <Link to="/inventory" className="station-link-btn">
            <span>Ver detalles en inventario</span>
            <span>→</span>
          </Link>
        </div>
      )}
    </div>
  );
};
