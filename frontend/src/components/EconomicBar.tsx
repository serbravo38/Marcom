/**
 * @file EconomicBar.tsx
 * @description Cinta de telemetría e indicadores en tiempo real ubicada en la parte superior
 * del panel principal (Dashboard) de Marcom.
 * 
 * Funcionalidad de Negocio:
 * Despliega los valores económicos oficiales del Banco Central de Chile (UF, Dólar, Euro, UTM, IPC)
 * y el clima actual del centro de operaciones.
 * - UF: Esencial para los cotizadores y ejecutivos comerciales que calculan contratos de servicio de pantallas.
 * - Dólar/Euro: Utilizados para estimar costos de reposición de módulos LED, placas controladoras y monitores importados.
 * - Clima: Indicador contextual de operaciones en terreno.
 * 
 * Patrones y Buenas Prácticas:
 * 1. Concurrencia con Promise.all: Ejecuta en paralelo las peticiones a mindicador.cl y Open-Meteo,
 *    reduciendo el tiempo total de bloqueo de la interfaz al valor máximo de ambas (no a su suma).
 * 2. Formato Monetario Estándar: Emplea la API nativa del navegador `Intl.NumberFormat` con localización 'es-CL',
 *    asegurando el uso correcto de separadores de miles con punto (.) y decimales con coma (,).
 */

import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  RefreshCw, 
  DollarSign, 
  Landmark, 
  Globe, 
  Activity,
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudRain,
  CloudLightning
} from "lucide-react";
import { indicatorsService, type IndicadoresEconomicos } from "../services/indicators";
import { weatherService, type WeatherData } from "../services/weather";

export const EconomicBar: React.FC = () => {
  // Estado local para los indicadores financieros
  const [data, setData] = useState<IndicadoresEconomicos | null>(null);
  // Estado local para el reporte meteorológico
  const [weather, setWeather] = useState<WeatherData | null>(null);
  // Estado booleano de sincronización activa
  const [loading, setLoading] = useState<boolean>(true);

  /**
   * Carga concurrentemente los indicadores y el clima local.
   */
  const loadData = async () => {
    setLoading(true);
    const [indResult, weatherResult] = await Promise.all([
      indicatorsService.getIndicators(),
      weatherService.getLocalWeather()
    ]);
    setData(indResult);
    setWeather(weatherResult);
    setLoading(false);
  };

  // Carga inicial al montar el componente
  useEffect(() => {
    loadData();
  }, []);

  /**
   * Formatea un valor numérico a la convención monetaria chilena (CLP).
   * 
   * @param val - Monto numérico bruto
   * @param decimals - Cantidad de dígitos decimales a mostrar
   */
  const formatCurrency = (val?: number, decimals: number = 2) => {
    if (val === undefined || val === null) return "---";
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(val);
  };

  /**
   * Selector dinámico de icono meteorológico según la categoría del reporte.
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

  // Si los datos no están disponibles aún, no renderizar para evitar saltos de layout (CLS)
  if (!data) return null;

  return (
    <div className="economic-indicators-bar animate-fade-in">
      {/* Insignia de estado en vivo */}
      <div className="eco-header-badge">
        <span className="eco-live-dot"></span>
        <Activity size={14} style={{ color: "#38bdf8" }} />
        <span>Indicadores en Vivo</span>
      </div>

      <div className="eco-tickers-container">
        {/* UF (Crucial para cotizaciones y contratos de monitores) */}
        <div className="eco-ticker-item" title="Unidad de Fomento oficial para contratos y cotizaciones">
          <div className="eco-icon-box gold">
            <Landmark size={14} />
          </div>
          <div className="eco-info">
            <span className="eco-label">UF</span>
            <span className="eco-value">{formatCurrency(data.uf?.valor, 2)}</span>
          </div>
        </div>

        {/* Dólar Observado (Importaciones de pantallas y hardware) */}
        <div className="eco-ticker-item" title="Dólar observado Banco Central de Chile">
          <div className="eco-icon-box cyan">
            <DollarSign size={14} />
          </div>
          <div className="eco-info">
            <span className="eco-label">Dólar (USD)</span>
            <span className="eco-value">{formatCurrency(data.dolar?.valor, 1)}</span>
          </div>
        </div>

        {/* Euro */}
        <div className="eco-ticker-item" title="Euro Banco Central de Chile">
          <div className="eco-icon-box blue">
            <Globe size={14} />
          </div>
          <div className="eco-info">
            <span className="eco-label">Euro (EUR)</span>
            <span className="eco-value">{formatCurrency(data.euro?.valor, 1)}</span>
          </div>
        </div>

        {/* UTM (Unidad Tributaria Mensual) */}
        <div className="eco-ticker-item" title="Unidad Tributaria Mensual">
          <div className="eco-icon-box purple">
            <TrendingUp size={14} />
          </div>
          <div className="eco-info">
            <span className="eco-label">UTM</span>
            <span className="eco-value">{formatCurrency(data.utm?.valor, 0)}</span>
          </div>
        </div>

        {/* IPC (Índice de Precios al Consumidor) */}
        {data.ipc && (
          <div className="eco-ticker-item" title="Índice de Precios al Consumidor mensual">
            <div className="eco-icon-box teal">
              <span style={{ fontSize: "0.7rem", fontWeight: 700 }}>%</span>
            </div>
            <div className="eco-info">
              <span className="eco-label">IPC</span>
              <span className="eco-value" style={{ color: data.ipc.valor >= 0 ? "#34d399" : "#f87171" }}>
                {data.ipc.valor > 0 ? `+${data.ipc.valor}%` : `${data.ipc.valor}%`}
              </span>
            </div>
          </div>
        )}

        {/* Clima Local Open-Meteo */}
        {weather && (
          <div 
            className="eco-ticker-item weather" 
            title={`Clima local en Santiago (Open-Meteo): ${weather.conditionText}, Sensación ${weather.apparentTemperature}°C, Humedad ${weather.humidity}%, Viento ${weather.windSpeed} km/h`}
          >
            <div className="eco-icon-box weather">
              {renderWeatherIcon(weather.iconType)}
            </div>
            <div className="eco-info">
              <span className="eco-label">Clima Stgo</span>
              <span className="eco-value">
                {weather.temperature}°C · {weather.conditionText}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Botón interactivo de recarga manual con animación de giro */}
      <button 
        className="eco-refresh-btn" 
        onClick={loadData} 
        disabled={loading}
        title="Actualizar valores oficiales de indicadores y clima"
      >
        <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        <span>Actualizar</span>
      </button>
    </div>
  );
};

export default EconomicBar;
