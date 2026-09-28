export interface IndicadorItem {
  codigo: string;
  nombre: string;
  unidad_medida: string;
  fecha: string;
  valor: number;
}

export interface IndicadoresEconomicos {
  version: string;
  autor: string;
  fecha: string;
  uf: IndicadorItem;
  ivp?: IndicadorItem;
  dolar: IndicadorItem;
  dolar_intercambio?: IndicadorItem;
  euro: IndicadorItem;
  ipc: IndicadorItem;
  utm: IndicadorItem;
  imacec?: IndicadorItem;
  tpm?: IndicadorItem;
  libra_cobre?: IndicadorItem;
  tasa_desempleo?: IndicadorItem;
  bitcoin?: IndicadorItem;
}

// Fallback values in case API is momentarily unreachable or offline
const FALLBACK_INDICADORES: IndicadoresEconomicos = {
  version: "1.7.0",
  autor: "mindicador.cl",
  fecha: new Date().toISOString(),
  uf: { codigo: "uf", nombre: "Unidad de fomento (UF)", unidad_medida: "Pesos", fecha: new Date().toISOString(), valor: 41040.82 },
  dolar: { codigo: "dolar", nombre: "Dólar observado", unidad_medida: "Pesos", fecha: new Date().toISOString(), valor: 964.10 },
  euro: { codigo: "euro", nombre: "Euro", unidad_medida: "Pesos", fecha: new Date().toISOString(), valor: 1098.06 },
  utm: { codigo: "utm", nombre: "Unidad Tributaria Mensual (UTM)", unidad_medida: "Pesos", fecha: new Date().toISOString(), valor: 71721 },
  ipc: { codigo: "ipc", nombre: "Índice de Precios al Consumidor (IPC)", unidad_medida: "Porcentaje", fecha: new Date().toISOString(), valor: -0.2 }
};

const CACHE_KEY = "marcom_economic_indicators";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache

export const indicatorsService = {
  getIndicators: async (): Promise<IndicadoresEconomicos> => {
    try {
      // 1. Check cached values in sessionStorage
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          return parsed.data;
        }
      }

      // 2. Fetch fresh data from public open-source mindicador.cl API
      const response = await fetch("https://mindicador.cl/api", {
        headers: { Accept: "application/json" }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Error al obtener indicadores`);
      }

      const data: IndicadoresEconomicos = await response.json();

      // 3. Save to cache
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ timestamp: Date.now(), data })
      );

      return data;
    } catch (error) {
      console.warn("No se pudo conectar a mindicador.cl, usando valores de respaldo:", error);
      return FALLBACK_INDICADORES;
    }
  }
};
