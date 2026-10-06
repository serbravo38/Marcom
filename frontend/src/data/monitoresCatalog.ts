export interface MonitorProduct {
  id: string;
  model: string;
  brand: string;
  inches: number;
  inchesLabel: string;
  resolution: string;
  resolutionType: '4K UHD' | 'Full HD' | 'Ultra-Wide' | 'WXGA';
  brightnessNits: number;
  operationHours: '24/7' | '16/7';
  aspectRatio: string;
  smartPlatform: string;
  contrastRatio: string;
  viewingAngle: string;
  connectivity: string[];
  specialFeatures: string[];
  condition: string;
  warranty: string;
  marketPriceCLP: number;
  marketPriceUF: number;
  originalPriceReferenceCLP: number;
  images: string[];
  description: string;
  recommendedUses: string[];
  badge?: string;
}

export const MONITORES_CATALOG: MonitorProduct[] = [
  {
    id: 'db10d',
    model: 'DB10D',
    brand: 'Samsung',
    inches: 10.1,
    inchesLabel: "10.1''",
    resolution: '1280 x 800 (WXGA)',
    resolutionType: 'WXGA',
    brightnessNits: 450,
    operationHours: '16/7',
    aspectRatio: '16:10',
    smartPlatform: 'MagicInfo S2 (Quad-Core SoC)',
    contrastRatio: '900:1',
    viewingAngle: '178° / 178°',
    connectivity: ['HDMI In', 'USB 2.0', 'SD Card Slot', 'RJ45 (LAN)', 'RS232C In'],
    specialFeatures: [
      'Factor de forma compacto ideal para retail interactivo y salas de reunión',
      'Sensor táctil opcional y sensor de presencia integrado',
      'Alimentación integrada y reproductor multimedia incorporado'
    ],
    condition: 'Reacondicionado Grado A (Inspeccionado 100%)',
    warranty: '3 meses de garantía Marcom',
    marketPriceCLP: 125000,
    marketPriceUF: 3.3,
    originalPriceReferenceCLP: 390000,
    images: [
      '/monitores/DB10D/1.avif',
      '/monitores/DB10D/2.avif',
      '/monitores/DB10D/3.avif',
      '/monitores/DB10D/4.avif',
      '/monitores/DB10D/5.avif',
      '/monitores/DB10D/6.avif'
    ],
    description: 'Monitor profesional compacto de alta luminosidad diseñado para estanterías, recepciones y señalética de salas de reuniones con funcionamiento confiable y bajo consumo.',
    recommendedUses: ['Puntos de venta (POS)', 'Señalética de salas de reunión', 'Retail en góndolas', 'Mostradores de atención']
  },
  {
    id: 'qm32r',
    model: 'QM32R',
    brand: 'Samsung',
    inches: 32,
    inchesLabel: "32''",
    resolution: '1920 x 1080 (Full HD)',
    resolutionType: 'Full HD',
    brightnessNits: 400,
    operationHours: '24/7',
    aspectRatio: '16:9',
    smartPlatform: 'Tizen 4.0 (SSSP 6.0)',
    contrastRatio: '5000:1',
    viewingAngle: '178° / 178°',
    connectivity: ['HDMI 2.0 (x2)', 'DVI-D In', 'USB 2.0 (x2)', 'RJ45', 'RS232C In/Out', 'Audio In/Out'],
    specialFeatures: [
      'Operación ininterrumpida 24/7 de grado comercial',
      'Panel antirreflejo (Non-Glare) para visibilidad perfecta',
      'Gestión de cables limpia y diseño ultra simétrico',
      'Knox Security integrada para despliegue empresarial'
    ],
    condition: 'Reacondicionado Grado A (Pantalla y chasis impecable)',
    warranty: '3 meses de garantía Marcom',
    marketPriceCLP: 210000,
    marketPriceUF: 5.5,
    originalPriceReferenceCLP: 490000,
    images: [
      '/monitores/QM32R/1.avif',
      '/monitores/QM32R/2.avif',
      '/monitores/QM32R/3.avif',
      '/monitores/QM32R/4.avif',
      '/monitores/QM32R/5.avif',
      '/monitores/QM32R/6.avif',
      '/monitores/QM32R/7.avif',
      '/monitores/QM32R/8.jpeg'
    ],
    description: 'Pantalla comercial premium con diseño estilizado y panel antirreflejo, ideal para tiendas departamentales, bancos y corporativos que requieren operación 24 horas al día.',
    recommendedUses: ['Menu boards digitales', 'Vitrinas comerciales', 'Lobbies corporativos', 'Clínicas y salas de espera']
  },
  {
    id: 'qm32rb',
    model: 'QM32RB',
    brand: 'Samsung',
    inches: 32,
    inchesLabel: "32''",
    resolution: '1920 x 1080 (Full HD)',
    resolutionType: 'Full HD',
    brightnessNits: 400,
    operationHours: '24/7',
    aspectRatio: '16:9',
    smartPlatform: 'Tizen 4.0 (SSSP 6.0)',
    contrastRatio: '5000:1',
    viewingAngle: '178° / 178°',
    connectivity: ['HDMI 2.0 (x2)', 'DVI-D In', 'USB 2.0 (x2)', 'RJ45', 'RS232C', 'WiFi integrado'],
    specialFeatures: [
      'Revisión optimizada QM32R con mayor eficiencia energética',
      'Panel Non-Glare antideslumbrante para luces cenitales intensas',
      'Instalación horizontal o vertical con rotación automática'
    ],
    condition: 'Reacondicionado Grado A',
    warranty: '3 meses de garantía Marcom',
    marketPriceCLP: 215000,
    marketPriceUF: 5.7,
    originalPriceReferenceCLP: 510000,
    images: [
      '/monitores/QM32RB/1.avif',
      '/monitores/QM32RB/2.avif',
      '/monitores/QM32RB/3.avif',
      '/monitores/QM32RB/4.avif',
      '/monitores/QM32RB/5.avif',
      '/monitores/QM32RB/6.avif',
      '/monitores/QM32RB/7.avif',
      '/monitores/QM32RB/8.jpeg'
    ],
    description: 'Versión especializada B-Series del modelo QM32R con panel antirreflejo de alto rendimiento para centros comerciales y aeropuertos.',
    recommendedUses: ['Centros comerciales', 'Kioscos de autoservicio', 'Monitoreo de sucursales']
  },
  {
    id: 'qm32c',
    model: 'QM32C',
    brand: 'Samsung',
    inches: 32,
    inchesLabel: "32''",
    resolution: '1920 x 1080 (Full HD)',
    resolutionType: 'Full HD',
    brightnessNits: 400,
    operationHours: '24/7',
    aspectRatio: '16:9',
    smartPlatform: 'Tizen 7.0 (SSSP 10.0)',
    contrastRatio: '5000:1',
    viewingAngle: '178° / 178°',
    connectivity: ['HDMI 2.0 (x3)', 'DisplayPort 1.2', 'USB 2.0 (x2)', 'RJ45', 'RS232C In/Out', 'WiFi 5 & Bluetooth'],
    specialFeatures: [
      'Diseño ultradelgado de última generación: solo 28.5 mm de grosor',
      'Biseles uniformes simétricos para integración estética impecable',
      'Calibración inteligente Smart Calibration mediante smartphone',
      'Tizen OS 7.0 con soporte para web apps avanzadas'
    ],
    condition: 'Reacondicionado Grado A (Estado como nuevo)',
    warranty: '3 meses de garantía Marcom',
    marketPriceCLP: 235000,
    marketPriceUF: 6.2,
    originalPriceReferenceCLP: 580000,
    badge: 'Última Generación Ultra-Slim',
    images: [
      '/monitores/QM32C/1.avif',
      '/monitores/QM32C/2.avif',
      '/monitores/QM32C/3.avif',
      '/monitores/QM32C/4.avif',
      '/monitores/QM32C/5.avif',
      '/monitores/QM32C/6.avif',
      '/monitores/QM32C/7.avif',
      '/monitores/QM32C/8.avif'
    ],
    description: 'La serie QMC redefine la cartelería comercial con un perfil de solo 28.5 mm y sistema Tizen 7.0 de máxima velocidad. Máxima elegancia para proyectos exigentes.',
    recommendedUses: ['Boutiques y alta costura', 'Recepción de hoteles', 'Salas de reuniones ejecutivas']
  },
  {
    id: 'sh37f',
    model: 'SH37F',
    brand: 'Samsung',
    inches: 37,
    inchesLabel: "37'' Barra Estirada",
    resolution: '1920 x 540 (Ultra-Wide 16:4.5)',
    resolutionType: 'Ultra-Wide',
    brightnessNits: 700,
    operationHours: '24/7',
    aspectRatio: '16:4.5 (Estirado / Stretched)',
    smartPlatform: 'MagicInfo S3 (Procesador Integrado)',
    contrastRatio: '4000:1',
    viewingAngle: '178° / 178°',
    connectivity: ['DisplayPort 1.2', 'HDMI (x2)', 'DVI-D', 'USB 2.0', 'RJ45', 'RS232C'],
    specialFeatures: [
      'Formato panorámico único 16:4.5 tipo cintillo / barra',
      'Alta luminosidad de 700 nits para áreas con sol directo o iluminación fuerte',
      'Panel no deslumbrante antirreflejo al 44%',
      'Capacidad de encadenamiento Daisy Chain DP1.2'
    ],
    condition: 'Reacondicionado Grado A (Raro en el mercado)',
    warranty: '3 meses de garantía Marcom',
    marketPriceCLP: 395000,
    marketPriceUF: 10.4,
    originalPriceReferenceCLP: 990000,
    badge: '700 Nits • Formato Panorámico',
    images: [
      '/monitores/SH37F/1.avif',
      '/monitores/SH37F/2.avif',
      '/monitores/SH37F/3.avif',
      '/monitores/SH37F/4.avif',
      '/monitores/SH37F/5.avif',
      '/monitores/SH37F/6.avif'
    ],
    description: 'Monitor panorámico de barra estirada con 700 nits de brillo. Ideal para pasillos, sobre estantes, cabeceras de góndola y señalética de transporte donde el espacio vertical es reducido.',
    recommendedUses: ['Cabeceras de góndola en supermercados', 'Cintillos en transporte y metro', 'Bancos y cajas de pago', 'Señalización sobre puertas']
  },
  {
    id: 'sh37r-b',
    model: 'SH37R-B',
    brand: 'Samsung',
    inches: 37,
    inchesLabel: "37'' Barra Estirada Pro",
    resolution: '1920 x 540 (Ultra-Wide 16:4.5)',
    resolutionType: 'Ultra-Wide',
    brightnessNits: 700,
    operationHours: '24/7',
    aspectRatio: '16:4.5 (Estirado / Stretched)',
    smartPlatform: 'Tizen 4.0 (SSSP 6.0)',
    contrastRatio: '4000:1',
    viewingAngle: '178° / 178°',
    connectivity: ['DisplayPort 1.2', 'HDMI 2.0', 'DVI-D', 'USB', 'RJ45 LAN', 'RS232C'],
    specialFeatures: [
      'Versión avanzada R-Series con Tizen 4.0 para reproducción de video fluida',
      'Brillo superior de 700 nits con Haze 44% que elimina reflejos molestos',
      'Chasis reforzado y compatibilidad horizontal/vertical'
    ],
    condition: 'Reacondicionado Grado A (Excelente estado)',
    warranty: '3 meses de garantía Marcom',
    marketPriceCLP: 440000,
    marketPriceUF: 11.6,
    originalPriceReferenceCLP: 1150000,
    badge: 'Panorámico Pro 700 Nits',
    images: [
      '/monitores/SH37R-B/1.avif',
      '/monitores/SH37R-B/2.avif',
      '/monitores/SH37R-B/3.avif',
      '/monitores/SH37R-B/4.avif',
      '/monitores/SH37R-B/5.avif',
      '/monitores/SH37R-B/6.avif'
    ],
    description: 'La solución definitiva para espacios reducidos: monitor alargado 16:4.5 con 700 nits y plataforma Tizen 4.0 para contenido dinámico de alto impacto visual.',
    recommendedUses: ['Estaciones y terminales de buses/trenes', 'Góndolas de farmacias y perfumerías', 'Señalética arquitectónica']
  },
  {
    id: 'pm43h',
    model: 'PM43H',
    brand: 'Samsung',
    inches: 43,
    inchesLabel: "43''",
    resolution: '1920 x 1080 (Full HD)',
    resolutionType: 'Full HD',
    brightnessNits: 500,
    operationHours: '24/7',
    aspectRatio: '16:9',
    smartPlatform: 'Tizen OS (SSSP 4.0)',
    contrastRatio: '3000:1',
    viewingAngle: '178° / 178°',
    connectivity: ['HDMI 2.0 (x2)', 'DisplayPort 1.2', 'DVI-I', 'USB 2.0 (x2)', 'RJ45', 'RS232C'],
    specialFeatures: [
      'Certificación IP5X a prueba de polvo (ideal para ambientes industriales y tiendas)',
      'Brillo alto de 500 nits con panel antirreflejo',
      'Receptor IR central integrado para control remoto simplificado'
    ],
    condition: 'Reacondicionado Grado A',
    warranty: '3 meses de garantía Marcom',
    marketPriceCLP: 295000,
    marketPriceUF: 7.8,
    originalPriceReferenceCLP: 720000,
    badge: 'IP5X Antipolvo • 500 Nits',
    images: [
      '/monitores/PM43H/1.avif',
      '/monitores/PM43H/2.avif',
      '/monitores/PM43H/3.avif',
      '/monitores/PM43H/4.jpeg',
      '/monitores/PM43H/5.avif',
      '/monitores/PM43H/6.avif',
      '/monitores/PM43H/7.avif'
    ],
    description: 'Monitor comercial robusto de 500 nits certificado contra el polvo IP5X. Perfecto para entornos de alto tráfico o polvo ambiental como restaurantes de comida rápida y galpones.',
    recommendedUses: ['Restaurantes y cocinas', 'Centros de distribución y bodegas', 'Transporte y pasillos concurridos']
  },
  {
    id: 'ph43f',
    model: 'PH43F',
    brand: 'Samsung',
    inches: 43,
    inchesLabel: "43''",
    resolution: '1920 x 1080 (Full HD)',
    resolutionType: 'Full HD',
    brightnessNits: 700,
    operationHours: '24/7',
    aspectRatio: '16:9',
    smartPlatform: 'Tizen OS (SSSP 4.0)',
    contrastRatio: '3000:1',
    viewingAngle: '178° / 178°',
    connectivity: ['DisplayPort 1.2', 'HDMI 2.0 (x2)', 'DVI-I', 'USB 2.0 (x2)', 'RJ45', 'RS232C'],
    specialFeatures: [
      'Máxima luminosidad de 700 nits para vidrieras y vitrinas con luz solar',
      'Protección certificada IP5X contra polvo y partículas',
      'Chasis ultra delgado de 29.9 mm para instalación pegada a muro'
    ],
    condition: 'Reacondicionado Grado A',
    warranty: '3 meses de garantía Marcom',
    marketPriceCLP: 330000,
    marketPriceUF: 8.7,
    originalPriceReferenceCLP: 820000,
    badge: 'Alta Luminosidad 700 Nits',
    images: [
      '/monitores/PH43F/1.avif',
      '/monitores/PH43F/2.jpeg',
      '/monitores/PH43F/3.avif',
      '/monitores/PH43F/4.avif',
      '/monitores/PH43F/5.jpeg',
      '/monitores/PH43F/6.jpeg',
      '/monitores/PH43F/7.jpeg',
      '/monitores/PH43F/8.jpeg'
    ],
    description: 'El buque insignia en brillo Full HD con 700 nits. Diseñado específicamente para vitrinas hacia la calle o tiendas con alta luminosidad natural donde una pantalla estándar se ve oscura.',
    recommendedUses: ['Vitrinas hacia el exterior', 'Locales a la calle', 'Centros de eventos y halls iluminados']
  },
  {
    id: 'qm43n',
    model: 'QM43N',
    brand: 'Samsung',
    inches: 43,
    inchesLabel: "43''",
    resolution: '3840 x 2160 (4K UHD)',
    resolutionType: '4K UHD',
    brightnessNits: 500,
    operationHours: '24/7',
    aspectRatio: '16:9',
    smartPlatform: 'Tizen 4.0 (SSSP 6.0)',
    contrastRatio: '4000:1',
    viewingAngle: '178° / 178°',
    connectivity: ['HDMI 2.0 (x2)', 'DisplayPort 1.2', 'DVI-D', 'USB 2.0 (x2)', 'RJ45', 'RS232C', 'WiFi'],
    specialFeatures: [
      'Resolución nativa 4K UHD con motor de escalado inteligente',
      'Panel antirreflejo Haze 25% para evitar reflejos de lámparas',
      'Seguridad corporativa Samsung Knox con cifrado de datos'
    ],
    condition: 'Reacondicionado Grado A',
    warranty: '3 meses de garantía Marcom',
    marketPriceCLP: 325000,
    marketPriceUF: 8.6,
    originalPriceReferenceCLP: 750000,
    badge: '4K UHD Nativo',
    images: [
      '/monitores/QM43N/1.avif',
      '/monitores/QM43N/2.avif',
      '/monitores/QM43N/3.avif',
      '/monitores/QM43N/4.avif',
      '/monitores/QM43N/5.avif',
      '/monitores/QM43N/6.avif',
      '/monitores/QM43N/7.jpeg',
      '/monitores/QM43N/8.avif',
      '/monitores/QM43N/9.avif'
    ],
    description: 'Monitor comercial 4K UHD con 500 nits. Brinda nitidez fotográfica en imágenes de productos, cartelería de lujo y salas de directorio.',
    recommendedUses: ['Salas de directorio y presentaciones', 'Tiendas de lujo y joyería', 'Centros de control y telemetría']
  },
  {
    id: 'qm43r',
    model: 'QM43R',
    brand: 'Samsung',
    inches: 43,
    inchesLabel: "43''",
    resolution: '3840 x 2160 (4K UHD)',
    resolutionType: '4K UHD',
    brightnessNits: 500,
    operationHours: '24/7',
    aspectRatio: '16:9',
    smartPlatform: 'Tizen 4.0 (SSSP 6.0)',
    contrastRatio: '4000:1',
    viewingAngle: '178° / 178°',
    connectivity: ['HDMI 2.0 (x2)', 'DisplayPort 1.2', 'DVI-D', 'USB 2.0 (x2)', 'RJ45', 'RS232C In/Out', 'WiFi y Bluetooth'],
    specialFeatures: [
      'Tecnología Dynamic Crystal Color con mil millones de tonos de color',
      'Procesador Quantum 4K con Intelligent UHD Upscaling',
      'Diseño simétrico con guía de cables integrada en el chasis',
      'Funcionamiento continuo 24/7 con panel Non-Glare'
    ],
    condition: 'Reacondicionado Grado A (Excelente condición cosmética)',
    warranty: '3 meses de garantía Marcom',
    marketPriceCLP: 340000,
    marketPriceUF: 8.9,
    originalPriceReferenceCLP: 790000,
    badge: '4K UHD • Dynamic Crystal',
    images: [
      '/monitores/QM43R/1.avif',
      '/monitores/QM43R/2.avif',
      '/monitores/QM43R/3.avif',
      '/monitores/QM43R/4.avif',
      '/monitores/QM43R/5.avif',
      '/monitores/QM43R/6.avif',
      '/monitores/QM43R/7.jpeg',
      '/monitores/QM43R/8.jpeg'
    ],
    description: 'El monitor 4K comercial más vendido del mercado. Su procesador Quantum analiza el contenido y optimiza el contraste y la definición en tiempo real.',
    recommendedUses: ['Retail corporativo', 'Salas de reuniones interactivas', 'Vitrinas de mall', 'Menús digitales premium']
  },
  {
    id: 'qm43c',
    model: 'QM43C',
    brand: 'Samsung',
    inches: 43,
    inchesLabel: "43''",
    resolution: '3840 x 2160 (4K UHD)',
    resolutionType: '4K UHD',
    brightnessNits: 500,
    operationHours: '24/7',
    aspectRatio: '16:9',
    smartPlatform: 'Tizen 7.0 (SSSP 10.0)',
    contrastRatio: '4000:1',
    viewingAngle: '178° / 178°',
    connectivity: ['HDMI 2.0 (x3)', 'DisplayPort 1.2', 'USB 2.0 (x2)', 'RJ45', 'RS232C', 'WiFi 5 & Bluetooth'],
    specialFeatures: [
      'Grosor ultra plano récord de tan solo 28.5 mm',
      'Nueva plataforma Tizen 7.0 con soporte para SmartThings y apps cloud',
      'Calibración móvil profesional con Smart Calibration',
      'Certificación ambiental Energy Star y EPEAT'
    ],
    condition: 'Reacondicionado Grado A (Como nuevo)',
    warranty: '3 meses de garantía Marcom',
    marketPriceCLP: 365000,
    marketPriceUF: 9.6,
    originalPriceReferenceCLP: 850000,
    badge: 'Tope de Línea 4K Ultra-Slim',
    images: [
      '/monitores/QM43C/1.avif',
      '/monitores/QM43C/2.avif',
      '/monitores/QM43C/3.avif',
      '/monitores/QM43C/4.avif',
      '/monitores/QM43C/5.avif',
      '/monitores/QM43C/6.avif',
      '/monitores/QM43C/7.avif',
      '/monitores/QM43C/8.avif'
    ],
    description: 'La pantalla comercial 4K más moderna y delgada de Samsung. Rendimiento gráfico sobresaliente, peso ligero para montaje sencillo y estética minimalista.',
    recommendedUses: ['Showrooms automotrices y retail de alta gama', 'Museos y galerías de arte', 'Salas de conferencia modernas']
  },
  {
    id: 'db49j',
    model: 'DB49J',
    brand: 'Samsung',
    inches: 49,
    inchesLabel: "49''",
    resolution: '1920 x 1080 (Full HD)',
    resolutionType: 'Full HD',
    brightnessNits: 300,
    operationHours: '16/7',
    aspectRatio: '16:9',
    smartPlatform: 'MagicInfo Lite Player',
    contrastRatio: '3000:1',
    viewingAngle: '178° / 178°',
    connectivity: ['HDMI (x2)', 'DVI-I In', 'USB 2.0', 'RJ45', 'RS232C In/Out', 'Audio In/Out'],
    specialFeatures: [
      'Gran formato de 49 pulgadas para máxima cobertura visual a bajo costo',
      'Operación económica 16/7 ideal para locales comerciales con horario normal',
      'Reproducción plug-and-play directa desde pendrive USB'
    ],
    condition: 'Reacondicionado Grado A',
    warranty: '3 meses de garantía Marcom',
    marketPriceCLP: 280000,
    marketPriceUF: 7.4,
    originalPriceReferenceCLP: 680000,
    badge: 'Gran Formato Económico',
    images: [
      '/monitores/DB49J/1.avif',
      '/monitores/DB49J/2.avif',
      '/monitores/DB49J/3.avif',
      '/monitores/DB49J/4.avif',
      '/monitores/DB49J/5.avif',
      '/monitores/DB49J/6.avif',
      '/monitores/DB49J/7.avif',
      '/monitores/DB49J/8.jpeg'
    ],
    description: 'Pantalla de 49 pulgadas con excelente relación tamaño-precio. Diseñada para comercios que operan hasta 16 horas diarias y buscan un gran impacto sin sobredimensionar el presupuesto.',
    recommendedUses: ['Locales comerciales y almacenes', 'Salas de espera y gimnasios', 'Cartelería informativa en recepciones']
  }
];

export const UF_CURRENT_VALUE = 38000;

export const formatCLP = (amount: number): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount);
};
