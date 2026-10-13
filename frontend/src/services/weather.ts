/**
 * @file weather.ts
 * @description Servicio cliente para la obtención de datos meteorológicos en tiempo real
 * utilizando la API de código abierto Open-Meteo (https://open-meteo.com).
 * 
 * Contexto de Negocio:
 * Marcom mantiene pantallas, tótems digitales y marquesinas a la intemperie en estaciones
 * de servicio (EDS) y locales a lo largo de Chile. Conocer las condiciones meteorológicas
 * (lluvia, viento extremo, temperaturas extremas) permite al equipo de operaciones y soporte
 * anticipar fallas térmicas o coordinar mantenimientos preventivos en terreno.
 * 
 * Decisiones Arquitectónicas:
 * 1. Proveedor Open Source: Open-Meteo no requiere API Keys privadas ni contratos comerciales,
 *    garantizando 100% de disponibilidad sin riesgo de suspensión por consumo de cuotas.
 * 2. Estrategia de Caché Multinivel:
 *    - Nivel 1 (L1 - Memoria): Map en memoria para lecturas instantáneas en la misma sesión de render.
 *    - Nivel 2 (L2 - SessionStorage): Persistencia de 15 minutos entre recargas de vista o navegación de rutas.
 * 3. Tolerancia a Fallos (Graceful Degradation): En caso de caída de conectividad externa,
 *    el servicio provee valores de respaldo nominales para no bloquear la interfaz de usuario.
 */

/**
 * Estructura de datos meteorológicos normalizada consumida por los componentes de UI.
 */
export interface WeatherData {
  /** Temperatura real actual medida a 2 metros del suelo (°C) */
  temperature: number;
  /** Sensación térmica considerando viento y humedad (°C) */
  apparentTemperature: number;
  /** Porcentaje de humedad relativa (0 - 100%) */
  humidity: number;
  /** Velocidad del viento sostenido a 10 metros de altura (km/h) */
  windSpeed: number;
  /** Código estándar numérico según la Organización Meteorológica Mundial (WMO) */
  weatherCode: number;
  /** Descripción legible en español del estado meteorológico (ej. 'Parcialmente nublado') */
  conditionText: string;
  /** Indicador booleano: true = diurno, false = nocturno (para selección de icono sol/luna) */
  isDay: boolean;
  /** Marca de tiempo ISO-8601 del reporte meteorológico */
  time: string;
  /** Categoría del icono recomendada para renderizado visual */
  iconType: "sun" | "moon" | "cloud-sun" | "cloud-moon" | "cloud" | "rain" | "fog" | "snow" | "thunder";
}

/**
 * Mapea los códigos universales WMO (World Meteorological Organization) a descripciones
 * en español y tipos de icono amigables para el usuario.
 * 
 * @param code - Código numérico entregado por Open-Meteo (ej. 0 = cielo despejado, 61 = lluvia)
 * @param isDay - Si la consulta corresponde a horario solar en esa ubicación geográfica
 * @returns Objeto con texto legible y categoría de icono para la interfaz
 */
export function decodeWmoWeather(
  code: number, 
  isDay: boolean = true
): { text: string; iconType: WeatherData["iconType"] } {
  switch (code) {
    case 0:
      return { 
        text: isDay ? "Despejado" : "Noche despejada", 
        iconType: isDay ? "sun" : "moon" 
      };
    case 1:
    case 2:
      return { 
        text: isDay ? "Parcialmente nublado" : "Parcialmente despejado", 
        iconType: isDay ? "cloud-sun" : "cloud-moon" 
      };
    case 3:
      return { text: "Nublado", iconType: "cloud" };
    case 45:
    case 48:
      return { text: "Niebla", iconType: "fog" };
    case 51:
    case 53:
    case 55:
      return { text: "Llovizna", iconType: "rain" };
    case 61:
    case 63:
    case 65:
      return { text: "Lluvia", iconType: "rain" };
    case 71:
    case 73:
    case 75:
      return { text: "Nevada", iconType: "snow" };
    case 80:
    case 81:
    case 82:
      return { text: "Chubascos", iconType: "rain" };
    case 95:
    case 96:
    case 99:
      return { text: "Tormenta eléctrica", iconType: "thunder" };
    default:
      return { text: "Condición normal", iconType: isDay ? "sun" : "moon" };
  }
}

// Configuración de la caché: Tiempo de vida (TTL) de 15 minutos en milisegundos
const CACHE_TTL_MS = 15 * 60 * 1000;

// Estructura en memoria RAM para evitar accesos redundantes al sessionStorage
const memoryCache = new Map<string, { data: WeatherData; timestamp: number }>();

/**
 * Genera una clave de caché geográfica unificada truncada a 2 decimales
 * (resolución aproximada de ~1 km, suficiente para condiciones climáticas homogéneas).
 */
function getCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)}_${lng.toFixed(2)}`;
}

export const weatherService = {
  /**
   * Obtiene el clima en tiempo real para unas coordenadas GPS específicas.
   * Aplica verificación en dos niveles de caché antes de realizar la petición HTTP.
   * 
   * @param lat - Latitud geográfica decimal (ej. -33.45 para Santiago)
   * @param lng - Longitud geográfica decimal (ej. -70.67 para Santiago)
   * @returns Promesa que resuelve la información meteorológica estandarizada
   */
  async getWeather(lat: number, lng: number): Promise<WeatherData> {
    const key = getCacheKey(lat, lng);
    const now = Date.now();

    // 1. Verificación Nivel 1: Caché en memoria viva
    const cached = memoryCache.get(key);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    // 2. Verificación Nivel 2: SessionStorage del navegador
    try {
      const storageItem = sessionStorage.getItem(`marcom_weather_${key}`);
      if (storageItem) {
        const parsed = JSON.parse(storageItem);
        if (now - parsed.timestamp < CACHE_TTL_MS) {
          memoryCache.set(key, parsed);
          return parsed.data;
        }
      }
    } catch {
      // Si el navegador tiene políticas restrictivas de storage, continuamos sin interrumpir
    }

    // 3. Consulta HTTP directa al endpoint abierto de Open-Meteo
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Error en API Open-Meteo (HTTP ${res.status})`);

      const data = await res.json();
      const current = data.current;
      const isDay = current.is_day === 1;
      const { text, iconType } = decodeWmoWeather(current.weather_code, isDay);

      const result: WeatherData = {
        temperature: Math.round(current.temperature_2m * 10) / 10,
        apparentTemperature: Math.round(current.apparent_temperature * 10) / 10,
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m * 10) / 10,
        weatherCode: current.weather_code,
        conditionText: text,
        isDay,
        time: current.time,
        iconType
      };

      // Guardar el resultado en ambas capas de caché
      const cacheEntry = { data: result, timestamp: now };
      memoryCache.set(key, cacheEntry);
      try {
        sessionStorage.setItem(`marcom_weather_${key}`, JSON.stringify(cacheEntry));
      } catch {
        // Ignorar posibles excepciones por cuota máxima de storage
      }

      return result;
    } catch (err) {
      console.warn("[weatherService] Falla al consultar Open-Meteo. Aplicando fallback nominal:", err);
      // Retornamos un valor de respaldo neutral representativo de la zona central de Chile
      const fallback: WeatherData = {
        temperature: 16.0,
        apparentTemperature: 15.5,
        humidity: 60,
        windSpeed: 8.5,
        weatherCode: 0,
        conditionText: "Despejado",
        isDay: true,
        time: new Date().toISOString(),
        iconType: "sun"
      };
      return fallback;
    }
  },

  /**
   * Obtiene las condiciones meteorológicas predeterminadas de la casa matriz / centro de monitoreo (Santiago de Chile).
   * Coordenadas de referencia: -33.4489, -70.6693 (Santiago Centro).
   */
  async getLocalWeather(): Promise<WeatherData> {
    return this.getWeather(-33.4489, -70.6693);
  }
};
