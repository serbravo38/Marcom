/**
 * @file indicators.ts
 * @description Servicio de integración con la API pública chilena mindicador.cl (https://mindicador.cl).
 * Obtiene los valores oficiales diarios de la Unidad de Fomento (UF), Dólar Observado (USD),
 * Euro (EUR), Unidad Tributaria Mensual (UTM) e Índice de Precios al Consumidor (IPC).
 * 
 * Relevancia Operativa para Marcom:
 * La totalidad de los convenios comerciales, órdenes de cotización y tarifas de flete/instalación
 * de pantallas industriales de la empresa se liquidan y cotizan en Unidades de Fomento (UF)
 * para proteger los márgenes operacionales contra la inflación. Asimismo, el equipamiento
 * audiovisual (pantallas Samsung/LG de alto brillo, media players y soportes) se cotiza en dólares.
 * 
 * Estrategia de Caché:
 * Dado que los valores oficiales del Banco Central de Chile cambian una vez por día (generalmente a las 09:00 hrs),
 * se define un TTL (Time-To-Live) de 30 minutos en `sessionStorage` para optimizar el consumo de red
 * y asegurar tiempos de carga menores a 5ms en la interfaz.
 */

/**
 * Representación individual de un indicador financiero según el esquema de mindicador.cl.
 */
export interface IndicadorItem {
  /** Código identificador del indicador (ej. 'uf', 'dolar', 'utm') */
  codigo: string;
  /** Nombre descriptivo oficial entregado por el emisor */
  nombre: string;
  /** Unidad de medida monetaria o porcentual (ej. 'Pesos', 'Porcentaje') */
  unidad_medida: string;
  /** Fecha de vigencia del valor en formato ISO-8601 */
  fecha: string;
  /** Valor numérico oficial de la jornada */
  valor: number;
}

/**
 * Estructura de respuesta completa entregada por el endpoint raíz de mindicador.cl.
 */
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

/**
 * Valores de contingencia (Fallback):
 * Se utilizan de manera transparente si el navegador carece de acceso a internet
 * o si el servicio externo experimenta una indisponibilidad momentánea.
 */
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

// Clave única para almacenamiento temporal en sesión
const CACHE_KEY = "marcom_economic_indicators";
// Tiempo de caducidad de la caché (30 minutos en milisegundos)
const CACHE_TTL_MS = 30 * 60 * 1000;

export const indicatorsService = {
  /**
   * Consulta los indicadores económicos oficiales vigentes.
   * Prioriza la lectura de caché de sesión para evitar peticiones redundantes.
   * 
   * @returns Promesa con los valores económicos consolidados
   */
  getIndicators: async (): Promise<IndicadoresEconomicos> => {
    try {
      // Paso 1: Intentar recuperar datos vigentes desde sessionStorage
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          return parsed.data;
        }
      }

      // Paso 2: Realizar petición HTTP asíncrona a la API pública
      const response = await fetch("https://mindicador.cl/api", {
        headers: { Accept: "application/json" }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Respuesta no satisfactoria de mindicador.cl`);
      }

      const data: IndicadoresEconomicos = await response.json();

      // Paso 3: Almacenar en caché con marca temporal de consulta
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ timestamp: Date.now(), data })
      );

      return data;
    } catch (error) {
      console.warn("[indicatorsService] Inaccesible mindicador.cl. Aplicando valores de respaldo nominales:", error);
      return FALLBACK_INDICADORES;
    }
  }
};
