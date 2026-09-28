// Servicio de Clima en tiempo real utilizando la API abierta Open-Meteo (100% Open Source, sin API Key)

export interface WeatherData {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  conditionText: string;
  isDay: boolean;
  time: string;
  iconType: "sun" | "moon" | "cloud-sun" | "cloud-moon" | "cloud" | "rain" | "fog" | "snow" | "thunder";
}

// Mapeo oficial de códigos meteorológicos WMO a descripciones en español e iconografía
export function decodeWmoWeather(code: number, isDay: boolean = true): { text: string; iconType: WeatherData["iconType"] } {
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
      return { text: "Normal", iconType: isDay ? "sun" : "moon" };
  }
}

// Cache en memoria y sessionStorage para optimizar rendimiento (TTL: 15 minutos)
const CACHE_TTL_MS = 15 * 60 * 1000;
const memoryCache = new Map<string, { data: WeatherData; timestamp: number }>();

function getCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)}_${lng.toFixed(2)}`;
}

export const weatherService = {
  /**
   * Obtiene el clima en tiempo real para unas coordenadas dadas
   */
  async getWeather(lat: number, lng: number): Promise<WeatherData> {
    const key = getCacheKey(lat, lng);
    const now = Date.now();

    // 1. Revisar memoria
    const cached = memoryCache.get(key);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    // 2. Revisar sessionStorage
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
      // Ignorar error de storage
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Weather fetch error: ${res.status}`);

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

      // Guardar en cache
      const cacheEntry = { data: result, timestamp: now };
      memoryCache.set(key, cacheEntry);
      try {
        sessionStorage.setItem(`marcom_weather_${key}`, JSON.stringify(cacheEntry));
      } catch {
        // Ignorar límites de almacenamiento
      }

      return result;
    } catch (err) {
      console.warn("Error consultando Open-Meteo, usando clima de respaldo:", err);
      // Fallback razonable para Chile central
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
   * Clima local predeterminado (Santiago de Chile)
   */
  async getLocalWeather(): Promise<WeatherData> {
    return this.getWeather(-33.4489, -70.6693);
  }
};
