/**
 * @file qrGenerator.ts
 * @description Generador nativo de matrices de Códigos QR (Estándar ISO/IEC 18004)
 * en modo Byte (UTF-8) con corrección de errores Reed-Solomon Nivel L / M.
 * 100% autónomo (sin dependencias externas ni llamadas de red), ideal para impresión
 * de etiquetas vectoriales SVG en alta resolución y lectura inmediata con cámaras de celular.
 */

// Tabla de capacidades y bloques para Nivel de Corrección L (7%) en versiones 1 a 15
// [totalCodewords, ecCodewordsPerBlock, numBlocksGroup1, dataCodewordsGroup1, numBlocksGroup2, dataCodewordsGroup2]
const VERSION_CAPACITY_L: Array<[number, number, number, number, number, number]> = [
  [0, 0, 0, 0, 0, 0], // Placeholder índice 0
  [26, 7, 1, 19, 0, 0],     // v1 (21x21) - hasta 17 bytes
  [44, 10, 1, 34, 0, 0],    // v2 (25x25) - hasta 32 bytes
  [70, 15, 1, 55, 0, 0],    // v3 (29x29) - hasta 53 bytes
  [100, 20, 1, 80, 0, 0],   // v4 (33x33) - hasta 78 bytes
  [134, 26, 1, 108, 0, 0],  // v5 (37x37) - hasta 106 bytes
  [172, 18, 2, 68, 0, 0],   // v6 (41x41) - hasta 134 bytes
  [196, 20, 2, 78, 0, 0],   // v7 (45x45) - hasta 154 bytes
  [242, 24, 2, 97, 0, 0],   // v8 (49x49) - hasta 192 bytes
  [292, 30, 2, 116, 0, 0],  // v9 (53x53) - hasta 230 bytes
  [346, 18, 2, 68, 2, 69],  // v10 (57x57) - hasta 271 bytes
  [404, 20, 4, 81, 0, 0],   // v11 (61x61) - hasta 321 bytes
  [466, 24, 2, 92, 2, 93],  // v12 (65x65) - hasta 367 bytes
  [532, 26, 4, 107, 0, 0],  // v13 (69x69) - hasta 425 bytes
  [581, 30, 3, 115, 1, 116],// v14 (73x73) - hasta 458 bytes
  [655, 22, 5, 87, 1, 88],  // v15 (77x77) - hasta 520 bytes
];

const ALIGNMENT_PATTERNS: number[][] = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
];

// Tablas de Cuerpo Finito GF(256) con polinomio primitivo 0x11D
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function getGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], root);
    }
    poly = next;
  }
  return poly;
}

function computeReedSolomon(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = getGeneratorPoly(ecLen);
  const msg = new Uint8Array(data.length + ecLen);
  msg.set(data, 0);
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return msg.slice(data.length);
}

function encodeUtf8Bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function generateQrMatrix(text: string): boolean[][] {
  const utf8 = encodeUtf8Bytes(text);

  // 1. Seleccionar versión mínima capaz de alojar los bytes en Modo Byte (0100)
  let version = 1;
  for (let v = 1; v < VERSION_CAPACITY_L.length; v++) {
    const [, , b1, d1, b2, d2] = VERSION_CAPACITY_L[v];
    const totalDataCap = b1 * d1 + b2 * d2;
    const countBits = v <= 9 ? 8 : 16;
    const maxBytes = Math.floor((totalDataCap * 8 - 4 - countBits) / 8);
    if (utf8.length <= maxBytes) {
      version = v;
      break;
    }
    if (v === VERSION_CAPACITY_L.length - 1) {
      version = v;
    }
  }

  const [, ecPerBlock, b1, d1, b2, d2] = VERSION_CAPACITY_L[version];
  const totalDataBytes = b1 * d1 + b2 * d2;
  const countBits = version <= 9 ? 8 : 16;

  // 2. Construir flujo de bits de datos
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1);
    }
  };

  // Indicador de modo Byte = 0100 (4)
  pushBits(0b0100, 4);
  const payloadBytes = utf8.slice(0, totalDataBytes - 3);
  pushBits(payloadBytes.length, countBits);
  for (let i = 0; i < payloadBytes.length; i++) {
    pushBits(payloadBytes[i], 8);
  }

  // Terminador (hasta 4 ceros)
  const maxDataBits = totalDataBytes * 8;
  for (let i = 0; i < 4 && bits.length < maxDataBits; i++) {
    bits.push(0);
  }
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const dataBytes = new Uint8Array(totalDataBytes);
  for (let i = 0; i < bits.length / 8; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bits[i * 8 + j];
    }
    dataBytes[i] = b;
  }

  // Relleno alternado 0xEC, 0x11
  let padToggle = true;
  for (let i = bits.length / 8; i < totalDataBytes; i++) {
    dataBytes[i] = padToggle ? 0xec : 0x11;
    padToggle = !padToggle;
  }

  // 3. Dividir en bloques y calcular corrección Reed-Solomon
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;
  for (let i = 0; i < b1; i++) {
    const block = dataBytes.slice(offset, offset + d1);
    offset += d1;
    dataBlocks.push(block);
    ecBlocks.push(computeReedSolomon(block, ecPerBlock));
  }
  for (let i = 0; i < b2; i++) {
    const block = dataBytes.slice(offset, offset + d2);
    offset += d2;
    dataBlocks.push(block);
    ecBlocks.push(computeReedSolomon(block, ecPerBlock));
  }

  // Intercalar bloques de datos y bloques EC
  const finalCodewords: number[] = [];
  const maxBlockLen = Math.max(d1, d2);
  for (let i = 0; i < maxBlockLen; i++) {
    for (const block of dataBlocks) {
      if (i < block.length) finalCodewords.push(block[i]);
    }
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (const block of ecBlocks) {
      if (i < block.length) finalCodewords.push(block[i]);
    }
  }

  // 4. Inicializar matriz geométrica (size = 17 + 4 * version)
  const size = 17 + version * 4;
  const modules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setFunctionModule = (r: number, c: number, dark: boolean) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      modules[r][c] = dark;
      isFunction[r][c] = true;
    }
  };

  // Patrones de búsqueda (Finder Patterns 7x7 + separadores)
  const drawFinderPattern = (row: number, col: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6 && (dr === 0 || dr === 6 || dc === 0 || dc === 6);
        const inInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFunctionModule(r, c, inOuter || inInner);
      }
    }
  };

  drawFinderPattern(0, 0);
  drawFinderPattern(0, size - 7);
  drawFinderPattern(size - 7, 0);

  // Patrones de sincronización (Timing Patterns)
  for (let i = 8; i < size - 8; i++) {
    setFunctionModule(6, i, i % 2 === 0);
    setFunctionModule(i, 6, i % 2 === 0);
  }

  // Patrones de alineación (Alignment Patterns 5x5)
  const alignCoords = ALIGNMENT_PATTERNS[version];
  for (let i = 0; i < alignCoords.length; i++) {
    for (let j = 0; j < alignCoords.length; j++) {
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === alignCoords.length - 1) ||
        (i === alignCoords.length - 1 && j === 0)
      ) {
        continue;
      }
      const cr = alignCoords[i];
      const cc = alignCoords[j];
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          setFunctionModule(cr + dr, cc + dc, dark);
        }
      }
    }
  }

  // Módulo oscuro fijo y reserva de áreas de formato
  setFunctionModule(size - 8, 8, true);
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      if (!isFunction[8][i]) setFunctionModule(8, i, false);
      if (!isFunction[i][8]) setFunctionModule(i, 8, false);
    }
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunction[8][size - 1 - i]) setFunctionModule(8, size - 1 - i, false);
    if (!isFunction[size - 1 - i][8]) setFunctionModule(size - 1 - i, 8, false);
  }

  // Información de versión para v >= 7
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i++) {
      rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    }
    const verBits = (version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const bit = ((verBits >>> i) & 1) !== 0;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFunctionModule(a, b, bit);
      setFunctionModule(b, a, bit);
    }
  }

  // 5. Colocar bits de datos en zigzag de derecha a izquierda
  let bitIdx = 0;
  const totalCodewordBits = finalCodewords.length * 8;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        const upward = ((right + 1) & 2) === 0;
        const r = upward ? size - 1 - vert : vert;
        if (!isFunction[r][c]) {
          let dark = false;
          if (bitIdx < totalCodewordBits) {
            const byteVal = finalCodewords[bitIdx >>> 3];
            dark = ((byteVal >>> (7 - (bitIdx & 7))) & 1) !== 0;
            bitIdx++;
          }
          // Aplicar máscara 0: (r + c) % 2 === 0
          if ((r + c) % 2 === 0) {
            dark = !dark;
          }
          modules[r][c] = dark;
        }
      }
    }
  }

  // 6. Escribir bits de formato para Nivel L (01) + Máscara 0 (000) -> data = 0b01000
  const formatData = (0b01 << 3) | 0;
  let rem = formatData;
  for (let i = 0; i < 10; i++) {
    rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  }
  const formatBits = ((formatData << 10) | rem) ^ 0x5412;
  const getFmtBit = (idx: number) => ((formatBits >>> idx) & 1) !== 0;

  for (let i = 0; i <= 5; i++) setFunctionModule(8, i, getFmtBit(i));
  setFunctionModule(8, 7, getFmtBit(6));
  setFunctionModule(8, 8, getFmtBit(7));
  setFunctionModule(7, 8, getFmtBit(8));
  for (let i = 9; i < 15; i++) setFunctionModule(14 - i, 8, getFmtBit(i));

  for (let i = 0; i < 8; i++) setFunctionModule(size - 1 - i, 8, getFmtBit(i));
  for (let i = 8; i < 15; i++) setFunctionModule(8, size - 15 + i, getFmtBit(i));
  setFunctionModule(size - 8, 8, true);

  return modules;
}
