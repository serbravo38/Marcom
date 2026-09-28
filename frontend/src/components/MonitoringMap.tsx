/**
 * @file MonitoringMap.tsx
 * @description Componente de mapa cartográfico interactivo para la visualización y monitoreo
 * en tiempo real de las estaciones de servicio (EDS) y locales de Marcom en Chile.
 * 
 * Tecnologías Utilizadas:
 * - Leaflet.js: Motor cartográfico de código abierto, ultraligero y desacoplado de frameworks propietarios.
 * - OpenStreetMap (OSM): Servidor de mosaicos libre y abierto (tile.openstreetmap.org) sin API Keys ni costos.
 * - Open-Meteo API: Consulta meteorológica en vivo integrada por cada local individual.
 * 
 * Decisiones de Arquitectura Frontend:
 * 1. Integración Leaflet en React: Dado que Leaflet manipula directamente el DOM, se gestiona
 *    el ciclo de vida del mapa mediante referencias (`useRef`) y efectos (`useEffect`).
 *    El desmontaje invoca rigurosamente `map.remove()` para evitar fugas de memoria (memory leaks).
 * 2. Invalidation de Dimensiones (`invalidateSize`): Los contenedores CSS basados en Grid o Glassmorphism
 *    pueden alterar su tamaño durante la fase inicial de renderizado. Se programa un micro-temporizador
 *    de 200ms para forzar el recálculo geométrico del mapa.
 * 3. Renderizado de Tema Oscuro (Dark GIS) sin dependencias comerciales: Se utilizan los mosaicos
 *    estándar de OpenStreetMap combinados con una clase CSS de inversión y matiz azulado
 *    (`.map-dark-tiles`), lo cual elimina la necesidad de proveedores pagos como Mapbox o CartoDB.
 * 4. Carga Meteorológica Asíncrona (Lazy Weather): El clima de cada estación se consulta
 *    únicamente cuando el usuario abre el popup del marcador (`popupopen`) o cuando la estación
 *    es seleccionada en la tarjeta flotante, protegiendo el ancho de banda y la cuota de red.
 */

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

/**
 * Propiedades de entrada del componente de mapa de monitoreo.
 */
interface MonitoringMapProps {
  /** Listado completo de locales/estaciones obtenidas desde inventario */
  locations: Ubicacion[];
  /** Callback opcional ejecutado al hacer clic en un pin o tarjeta */
  onSelectStation?: (loc: Ubicacion) => void;
  /** Estación seleccionada por defecto desde el componente padre */
  selectedStation?: Ubicacion | null;
}

export const MonitoringMap: React.FC<MonitoringMapProps> = ({
  locations,
  onSelectStation,
  selectedStation
}) => {
  // Referencia al contenedor HTML nativo del mapa
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  // Instancia persistente del objeto Map de Leaflet
  const mapInstanceRef = useRef<L.Map | null>(null);
  // Capa contenedora de marcadores para permitir limpieza y actualización atómica
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Estados locales para interactividad
  const [activeStation, setActiveStation] = useState<Ubicacion | null>(null);
  const [stationWeather, setStationWeather] = useState<WeatherData | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Sincronización de estación activa: respeta la prop exterior o selecciona la primera disponible
  useEffect(() => {
    if (selectedStation) {
      setActiveStation(selectedStation);
    } else if (!activeStation && locations.length > 0) {
      // Priorizar una estación de la Región Metropolitana como vista inicial
      const stgo = locations.find(
        (l) =>
          (l.comuna || "").toUpperCase().includes("SANTIAGO") ||
          (l.region || "").toUpperCase().includes("METROPOLITANA")
      );
      setActiveStation(stgo || locations[0]);
    }
  }, [locations, selectedStation]);

  // Carga asíncrona del clima de la estación activa actualmente seleccionada
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

  // Ciclo de Vida: Inicialización y destrucción de la instancia Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Configuración inicial centrada en Santiago de Chile
    const map = L.map(mapContainerRef.current, {
      center: [-33.4489, -70.6693],
      zoom: 11,
      zoomControl: false, // Desactivar controles por defecto para estilizarlos a medida
      attributionControl: false
    });

    // Control de zoom posicionado en la esquina superior izquierda
    L.control.zoom({ position: "topleft" }).addTo(map);

    // Atribución de código abierto requerida por la licencia de OpenStreetMap
    L.control
      .attribution({ position: "bottomleft", prefix: false })
      .addAttribution(
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
      )
      .addTo(map);

    // Capa de mosaicos oficial OpenStreetMap (Open Source y libre)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      subdomains: ["a", "b", "c"],
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Grupo de marcadores para inserción y limpieza eficiente
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    // Forzar recalculo de dimensiones del mapa una vez montado el DOM
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Ciclo de Vida: Creación y renderizado de pines geográficos y popups interactivos
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    // Limpiar marcadores previos para evitar duplicaciones
    markersLayerRef.current.clearLayers();

    locations.forEach((loc) => {
      // Resolver coordenadas con el algoritmo de dispersión determinista
      const coords = getLocationCoordinates(
        loc.comuna,
        loc.region,
        loc.ubicacion_id || loc.codigo_local || ""
      );

      const isSelected = activeStation?.ubicacion_id === loc.ubicacion_id;

      // Icono personalizado basado en HTML/CSS con efecto de pulso radar cian
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

      // Estructura HTML estilizada del popup con contenedor para inyección meteorológica
      const popupContent = `
        <div class="leaflet-custom-popup">
          <div class="l-pop-badge">${loc.codigo_local || "LOCAL"}</div>
          <div class="l-pop-title">${loc.nombre}</div>
          <div class="l-pop-address">📍 ${loc.direccion}</div>
          <div class="l-pop-comuna">${loc.comuna || ""}, ${loc.region || ""}</div>
          
          <!-- Contenedor dinámico del clima en vivo -->
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

      // Hook de evento: Cuando el usuario abre el popup, se consulta Open-Meteo para ese punto exacto
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

      // Evento de clic: Sincroniza la estación activa en la tarjeta flotante inferior
      marker.on("click", () => {
        setActiveStation(loc);
        if (onSelectStation) {
          onSelectStation(loc);
        }
      });

      marker.addTo(markersLayerRef.current!);
    });
  }, [locations, activeStation, onSelectStation]);

  /**
   * Navega con animación suave (flyTo) hacia la zona central de Santiago.
   */
  const handleCenterSantiago = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([-33.4489, -70.6693], 11, {
      duration: 1.2
    });
  };

  /**
   * Calcula los límites geográficos envolventes (bounding box) de todas las estaciones
   * y encuadra automáticamente la vista para mostrar la red a lo largo de todo Chile.
   */
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

  /**
   * Helper para renderizar iconos temáticos meteorológicos según el código WMO.
   */
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
      {/* Barra superior de herramientas y controles del mapa */}
      <div className="map-controls-toolbar">
        <div className="map-badge-count">
          <span className="live-pulse-dot"></span>
          <span>{locations.length} Estaciones en Red</span>
        </div>

        <div className="map-actions-group">
          {/* Acción rápida: Centrar en Santiago */}
          <button
            type="button"
            className="map-tool-btn"
            onClick={handleCenterSantiago}
            title="Centrar en Región Metropolitana"
          >
            <Navigation size={13} />
            <span>Santiago</span>
          </button>

          {/* Acción rápida: Encuadre panorámico nacional */}
          <button
            type="button"
            className="map-tool-btn"
            onClick={handleFitAllChile}
            title="Ver todas las estaciones a lo largo de Chile"
          >
            <Maximize2 size={13} />
            <span>Chile</span>
          </button>

          {/* Alternar filtro visual: Oscuro (Dark GIS) / Claro (Natural OSM) */}
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

      {/* Tarjeta flotante interactiva sincronizada con la estación y su clima en vivo */}
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
