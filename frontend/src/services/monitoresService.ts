/**
 * @file monitoresService.ts
 * @description Servicio CRUD y gestión del catálogo de monitores reacondicionados.
 * Permite al Administrador agregar, editar y eliminar monitores del catálogo público con persistencia local y sincronización.
 */

import { MONITORES_CATALOG, type MonitorProduct } from "../data/monitoresCatalog";

const STORAGE_KEY = "marcom_monitores_catalog";

/**
 * Obtiene todos los monitores del catálogo.
 * Si no existen en localStorage, inicializa con la lista por defecto.
 */
export const getMonitores = (): MonitorProduct[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Error leyendo catálogo guardado:", e);
  }
  // Inicializar con catálogo por defecto
  saveMonitores(MONITORES_CATALOG);
  return [...MONITORES_CATALOG];
};

/**
 * Guarda la lista de monitores en localStorage.
 */
export const saveMonitores = (monitores: MonitorProduct[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(monitores));
  } catch (e) {
    console.error("Error guardando monitores en localStorage:", e);
  }
};

/**
 * Obtiene un monitor por su ID.
 */
export const getMonitorById = (id: string): MonitorProduct | undefined => {
  const all = getMonitores();
  return all.find((m) => m.id === id);
};

/**
 * Crea y agrega un nuevo monitor al catálogo.
 */
export const createMonitor = (data: Omit<MonitorProduct, "id">): MonitorProduct => {
  const all = getMonitores();
  const newId = data.model.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Math.floor(100 + Math.random() * 900);
  
  const newMonitor: MonitorProduct = {
    ...data,
    id: newId
  };

  const updated = [newMonitor, ...all];
  saveMonitores(updated);
  return newMonitor;
};

/**
 * Actualiza los datos de un monitor existente.
 */
export const updateMonitor = (id: string, data: Partial<MonitorProduct>): MonitorProduct => {
  const all = getMonitores();
  const index = all.findIndex((m) => m.id === id);
  if (index === -1) {
    throw new Error(`Monitor con ID '${id}' no encontrado.`);
  }

  const updatedMonitor: MonitorProduct = {
    ...all[index],
    ...data
  };

  all[index] = updatedMonitor;
  saveMonitores(all);
  return updatedMonitor;
};

/**
 * Elimina un monitor del catálogo.
 */
export const deleteMonitor = (id: string): boolean => {
  const all = getMonitores();
  const filtered = all.filter((m) => m.id !== id);
  if (filtered.length === all.length) {
    return false;
  }
  saveMonitores(filtered);
  return true;
};

/**
 * Restaura el catálogo completo a los valores por defecto iniciales.
 */
export const resetMonitoresToDefault = (): MonitorProduct[] => {
  saveMonitores(MONITORES_CATALOG);
  return [...MONITORES_CATALOG];
};
