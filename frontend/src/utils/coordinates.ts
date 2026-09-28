// Diccionario y utilidades de geolocalización para locales de Marcom en Chile
export interface Coordinates {
  lat: number;
  lng: number;
}

export const CHILE_COMUNA_COORDS: Record<string, [number, number]> = {
  "ALTO HOSPICIO": [-20.2736, -70.1068],
  "ANCUD": [-41.8687, -73.8294],
  "ANTOFAGASTA": [-23.6509, -70.3975],
  "AYSÉN": [-45.4056, -72.6936],
  "BUIN": [-33.7328, -70.7428],
  "CALAMA": [-22.4544, -68.9294],
  "CASTRO": [-42.4721, -73.7731],
  "CATEMU": [-32.7797, -70.9639],
  "CHAÑARAL": [-26.3478, -70.6225],
  "CHIGUAYANTE": [-36.9144, -73.0239],
  "COLBÚN": [-35.6983, -71.4131],
  "COLINA": [-33.2039, -70.6761],
  "CONCEPCIÓN": [-36.8201, -73.0444],
  "CONSTITUCIÓN": [-35.3332, -72.4117],
  "COQUIMBO": [-29.9533, -71.3436],
  "COYHAIQUE": [-45.5752, -72.0662],
  "CURICÓ": [-34.9854, -71.2394],
  "DOÑIHUE": [-34.2289, -70.9639],
  "FUTALEUFÚ": [-43.1844, -71.8686],
  "HUECHURABA": [-33.3742, -70.6386],
  "INDEPENDENCIA": [-33.4161, -70.6583],
  "ISLA DE MAIPO": [-33.7547, -70.8986],
  "LA CISTERNA": [-33.5286, -70.6625],
  "LA FLORIDA": [-33.5227, -70.5991],
  "LA GRANJA": [-33.5358, -70.6247],
  "LA REINA": [-33.4419, -70.5342],
  "LA SERENA": [-29.9027, -71.2519],
  "LAJA": [-37.2831, -72.7094],
  "LAMPA": [-33.2858, -70.8711],
  "LAS CONDES": [-33.4116, -70.5802],
  "LINARES": [-35.8454, -71.5979],
  "LLANQUIHUE": [-41.2564, -73.0078],
  "LOS ANDES": [-32.8339, -70.5983],
  "LOS ANGELES": [-37.4697, -72.3537],
  "MAIPÚ": [-33.5097, -70.7573],
  "MARIQUINA": [-39.5167, -72.9667],
  "NATALES": [-51.7269, -72.5068],
  "NOGALES": [-32.7333, -71.2000],
  "O'HIGGINS": [-48.4667, -72.5667],
  "OSORNO": [-40.5739, -73.1335],
  "PAPUDO": [-32.5097, -71.4519],
  "PICHILEMU": [-34.3875, -72.0044],
  "PROVIDENCIA": [-33.4314, -70.6093],
  "PUCÓN": [-39.2778, -71.9753],
  "PUENTE ALTO": [-33.6117, -70.5758],
  "PUERTO MONTT": [-41.4693, -72.9424],
  "PUNTA ARENAS": [-53.1638, -70.9171],
  "QUELLÓN": [-43.1189, -73.6142],
  "QUILLOTA": [-32.8803, -71.2486],
  "QUILPUÉ": [-33.0489, -71.4428],
  "QUINTA NORMAL": [-33.4319, -70.6917],
  "RANCAGUA": [-34.1708, -70.7444],
  "RENCA": [-33.4042, -70.7189],
  "SAN BERNARDO": [-33.5922, -70.7047],
  "SAN ESTEBAN": [-32.8000, -70.5833],
  "SAN JOAQUÍN": [-33.4939, -70.6278],
  "SAN MIGUEL": [-33.4914, -70.6517],
  "SAN RAMÓN": [-33.5289, -70.6433],
  "SANTA CRUZ": [-34.6389, -71.3644],
  "SANTIAGO": [-33.4489, -70.6693],
  "SANTO DOMINGO": [-33.6367, -71.6289],
  "TALCA": [-35.4264, -71.6554],
  "TEMUCO": [-38.7359, -72.5904],
  "VALDIVIA": [-39.8142, -73.2459],
  "VALLENAR": [-28.5708, -70.7581],
  "VALPARAÍSO": [-33.0472, -71.6127],
  "VILLA ALEGRE": [-35.6744, -71.7439],
  "VILLARRICA": [-39.2817, -72.2272],
  "VIÑA DEL MAR": [-33.0245, -71.5518],
  "ÑUÑOA": [-33.4569, -70.5975],
  "VITACURA": [-33.3989, -70.5786],
  "LO BARNECHEA": [-33.3533, -70.5186]
};

// Genera un offset pseudo-aleatorio determinista para separar puntos en la misma comuna
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getLocationCoordinates(
  comuna?: string | null,
  region?: string | null,
  uniqueKey: string = ""
): Coordinates {
  const normComuna = (comuna || "").toUpperCase().trim();
  let baseCoords = CHILE_COMUNA_COORDS[normComuna];

  if (!baseCoords) {
    // Si la comuna no está directa, buscar por match parcial
    const foundKey = Object.keys(CHILE_COMUNA_COORDS).find((k) =>
      normComuna.includes(k) || k.includes(normComuna)
    );
    if (foundKey) {
      baseCoords = CHILE_COMUNA_COORDS[foundKey];
    }
  }

  // Fallback por región
  if (!baseCoords) {
    const normRegion = (region || "").toUpperCase();
    if (normRegion.includes("ANTOFAGASTA")) baseCoords = [-23.6509, -70.3975];
    else if (normRegion.includes("TARAPACÁ")) baseCoords = [-20.2736, -70.1068];
    else if (normRegion.includes("ATACAMA")) baseCoords = [-27.3668, -70.3323];
    else if (normRegion.includes("COQUIMBO")) baseCoords = [-29.9027, -71.2519];
    else if (normRegion.includes("VALPARAÍSO")) baseCoords = [-33.0472, -71.6127];
    else if (normRegion.includes("BIOBÍO")) baseCoords = [-36.8201, -73.0444];
    else if (normRegion.includes("LOS LAGOS")) baseCoords = [-41.4693, -72.9424];
    else if (normRegion.includes("MAGALLANES")) baseCoords = [-53.1638, -70.9171];
    else baseCoords = [-33.4489, -70.6693]; // Santiago Centro default
  }

  // Jitter determinista para que locales en la misma comuna no se solapen exactamente
  const hash = hashString(uniqueKey || normComuna);
  const offsetLat = ((hash % 17) - 8) * 0.0035;
  const offsetLng = (((hash >> 4) % 17) - 8) * 0.0035;

  return {
    lat: baseCoords[0] + offsetLat,
    lng: baseCoords[1] + offsetLng
  };
}
