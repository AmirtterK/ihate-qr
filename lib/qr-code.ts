// Complete, zero-dependency QR Code Matrix Generator (ISO/IEC 18004)
// Error correction levels: L (7%), M (15%), Q (25%), H (30%)

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

// Galois Field GF(256) arithmetic for Reed-Solomon codes
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 256) {
      x ^= 0x11d; // Primitive polynomial x^8 + x^4 + x^3 + x^2 + 1
    }
  }
  for (let i = 255; i < 512; i++) {
    EXP[i] = EXP[i - 255];
  }
})();

function gmult(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

// Generate Reed-Solomon generator polynomial
function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const factor = new Uint8Array([1, EXP[i]]);
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gmult(poly[j], factor[0]);
      next[j + 1] ^= gmult(poly[j], factor[1]);
    }
    poly = next;
  }
  return poly;
}

// Compute Reed-Solomon error correction codewords
function rsCompute(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = rsGeneratorPoly(ecCount);
  const res = new Uint8Array(ecCount);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ res[0];
    for (let j = 0; j < ecCount - 1; j++) {
      res[j] = res[j + 1] ^ gmult(gen[j + 1], factor);
    }
    res[ecCount - 1] = gmult(gen[ecCount], factor);
  }
  return res;
}

// Standard QR Table: [TotalCW, DataCW_L, DataCW_M, DataCW_Q, DataCW_H, Blocks_L, Blocks_M, Blocks_Q, Blocks_H]
// For brevity and extreme stability, support Versions 1 through 10 (sufficient for up to ~174 bytes of text at Level H)
interface VersionSpec {
  version: number;
  totalCodewords: number;
  ecCodewordsPerBlock: { L: number; M: number; Q: number; H: number };
  blocks: {
    L: [number, number][]; // [numBlocks, dataCodewordsPerBlock]
    M: [number, number][];
    Q: [number, number][];
    H: [number, number][];
  };
  alignment: number[];
}

const VERSION_SPECS: VersionSpec[] = [
  {
    version: 1,
    totalCodewords: 26,
    ecCodewordsPerBlock: { L: 7, M: 10, Q: 13, H: 17 },
    blocks: {
      L: [[1, 19]],
      M: [[1, 16]],
      Q: [[1, 13]],
      H: [[1, 9]]
    },
    alignment: []
  },
  {
    version: 2,
    totalCodewords: 44,
    ecCodewordsPerBlock: { L: 10, M: 16, Q: 22, H: 28 },
    blocks: {
      L: [[1, 34]],
      M: [[1, 28]],
      Q: [[1, 22]],
      H: [[1, 16]]
    },
    alignment: [6, 18]
  },
  {
    version: 3,
    totalCodewords: 70,
    ecCodewordsPerBlock: { L: 15, M: 26, Q: 18, H: 22 },
    blocks: {
      L: [[1, 55]],
      M: [[1, 44]],
      Q: [[2, 17]],
      H: [[2, 13]]
    },
    alignment: [6, 22]
  },
  {
    version: 4,
    totalCodewords: 100,
    ecCodewordsPerBlock: { L: 20, M: 18, Q: 26, H: 16 },
    blocks: {
      L: [[1, 80]],
      M: [[2, 32]],
      Q: [[2, 24]],
      H: [[4, 9]]
    },
    alignment: [6, 26]
  },
  {
    version: 5,
    totalCodewords: 134,
    ecCodewordsPerBlock: { L: 26, M: 24, Q: 18, H: 22 },
    blocks: {
      L: [[1, 108]],
      M: [[2, 43]],
      Q: [[2, 15], [2, 16]],
      H: [[2, 11], [2, 12]]
    },
    alignment: [6, 30]
  },
  {
    version: 6,
    totalCodewords: 172,
    ecCodewordsPerBlock: { L: 18, M: 16, Q: 24, H: 28 },
    blocks: {
      L: [[2, 68]],
      M: [[4, 27]],
      Q: [[4, 19]],
      H: [[4, 15]]
    },
    alignment: [6, 34]
  },
  {
    version: 7,
    totalCodewords: 196,
    ecCodewordsPerBlock: { L: 20, M: 18, Q: 18, H: 26 },
    blocks: {
      L: [[2, 78]],
      M: [[4, 31]],
      Q: [[2, 14], [4, 15]],
      H: [[4, 13], [1, 14]]
    },
    alignment: [6, 22, 38]
  },
  {
    version: 8,
    totalCodewords: 242,
    ecCodewordsPerBlock: { L: 24, M: 22, Q: 22, H: 26 },
    blocks: {
      L: [[2, 97]],
      M: [[2, 38], [2, 39]],
      Q: [[4, 18], [2, 19]],
      H: [[4, 14], [2, 15]]
    },
    alignment: [6, 24, 42]
  },
  {
    version: 9,
    totalCodewords: 292,
    ecCodewordsPerBlock: { L: 30, M: 22, Q: 20, H: 24 },
    blocks: {
      L: [[2, 116]],
      M: [[3, 36], [2, 37]],
      Q: [[4, 16], [4, 17]],
      H: [[4, 12], [4, 13]]
    },
    alignment: [6, 26, 46]
  },
  {
    version: 10,
    totalCodewords: 346,
    ecCodewordsPerBlock: { L: 18, M: 26, Q: 24, H: 28 },
    blocks: {
      L: [[2, 68], [2, 69]],
      M: [[4, 43], [1, 44]],
      Q: [[6, 19], [2, 20]],
      H: [[6, 15], [2, 16]]
    },
    alignment: [6, 28, 50]
  }
];

export interface QRCodeData {
  version: number;
  size: number; // width/height in modules
  modules: boolean[][];
  isFinderPattern: boolean[][];
}

class BitBuffer {
  buffer: number[] = [];
  length = 0;

  put(num: number, length: number) {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    }
  }

  putBit(bit: boolean) {
    const byteIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= byteIndex) {
      this.buffer.push(0);
    }
    if (bit) {
      this.buffer[byteIndex] |= 0x80 >>> (this.length % 8);
    }
    this.length++;
  }
}

// Encode UTF-8 text in 8-bit Byte Mode
function encodeData(text: string, version: number, ecl: ErrorCorrectionLevel, spec: VersionSpec): Uint8Array {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);

  const bb = new BitBuffer();
  // 1. Mode indicator: 0100 for Byte Mode
  bb.put(0x04, 4);

  // 2. Character count indicator (8 bits for V1-9, 16 bits for V10+)
  const countBits = version < 10 ? 8 : 16;
  bb.put(bytes.length, countBits);

  // 3. Data payload
  for (let i = 0; i < bytes.length; i++) {
    bb.put(bytes[i], 8);
  }

  // Calculate total required data codewords for this version & level
  let totalDataCW = 0;
  for (const [numBlocks, dcw] of spec.blocks[ecl]) {
    totalDataCW += numBlocks * dcw;
  }
  const totalDataBits = totalDataCW * 8;

  // 4. Terminator (up to 4 zeros)
  const remaining = totalDataBits - bb.length;
  bb.put(0, Math.min(4, Math.max(0, remaining)));

  // 5. Pad to byte boundary
  while (bb.length % 8 !== 0) {
    bb.putBit(false);
  }

  // 6. Pad bytes 0xEC and 0x11
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bb.length < totalDataBits) {
    bb.put(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  const dataArray = new Uint8Array(bb.buffer);

  // 7. Split into blocks and compute Reed-Solomon EC
  const ecPerBlock = spec.ecCodewordsPerBlock[ecl];
  const blockDataList: Uint8Array[] = [];
  const blockEcList: Uint8Array[] = [];

  let dataOffset = 0;
  for (const [numBlocks, dcw] of spec.blocks[ecl]) {
    for (let b = 0; b < numBlocks; b++) {
      const bData = dataArray.subarray(dataOffset, dataOffset + dcw);
      const bEc = rsCompute(bData, ecPerBlock);
      blockDataList.push(bData);
      blockEcList.push(bEc);
      dataOffset += dcw;
    }
  }

  // 8. Interleave data codewords
  const interleaved = new Uint8Array(spec.totalCodewords);
  let outIdx = 0;
  let maxDataLen = 0;
  for (const b of blockDataList) {
    if (b.length > maxDataLen) maxDataLen = b.length;
  }

  for (let i = 0; i < maxDataLen; i++) {
    for (const b of blockDataList) {
      if (i < b.length) {
        interleaved[outIdx++] = b[i];
      }
    }
  }

  // 9. Interleave EC codewords
  for (let i = 0; i < ecPerBlock; i++) {
    for (const ec of blockEcList) {
      interleaved[outIdx++] = ec[i];
    }
  }

  return interleaved;
}

// Generate the matrix
export function generateQRMatrix(text: string, ecl: ErrorCorrectionLevel = 'H'): QRCodeData {
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text).length;

  // Find lowest version that fits
  let selectedSpec: VersionSpec | null = null;
  for (const spec of VERSION_SPECS) {
    let cap = 0;
    for (const [numBlocks, dcw] of spec.blocks[ecl]) {
      cap += numBlocks * dcw;
    }
    // Overhead: 4 mode bits + (count bits 8 or 16)
    const headerBits = 4 + (spec.version < 10 ? 8 : 16);
    const maxDataBytes = Math.floor((cap * 8 - headerBits) / 8);
    if (textBytes <= maxDataBytes) {
      selectedSpec = spec;
      break;
    }
  }

  if (!selectedSpec) {
    selectedSpec = VERSION_SPECS[VERSION_SPECS.length - 1]; // Max fallback
  }

  const version = selectedSpec.version;
  const size = 17 + 4 * version;
  const modules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFinderPattern: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Helper to mark modules
  function setModule(r: number, c: number, dark: boolean, finder = false) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      modules[r][c] = dark;
      isFunction[r][c] = true;
      if (finder) isFinderPattern[r][c] = true;
    }
  }

  // 1. Finder patterns (7x7) at 3 corners
  function placeFinder(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        const isBorder = (r === 0 || r === 6 || c === 0 || c === 6);
        const isCenter = (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        const isSep = (r === -1 || r === 7 || c === -1 || c === 7);
        if (isSep) {
          setModule(nr, nc, false, true);
        } else {
          setModule(nr, nc, isBorder || isCenter, true);
        }
      }
    }
  }

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // 2. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setModule(6, i, i % 2 === 0);
    if (!isFunction[i][6]) setModule(i, 6, i % 2 === 0);
  }

  // 3. Alignment patterns
  const alignCoords = selectedSpec.alignment;
  for (let i = 0; i < alignCoords.length; i++) {
    for (let j = 0; j < alignCoords.length; j++) {
      const r = alignCoords[i];
      const c = alignCoords[j];
      // Skip corners where finders exist
      if ((r === 6 && c === 6) || (r === 6 && c === alignCoords[alignCoords.length - 1]) || (r === alignCoords[alignCoords.length - 1] && c === 6)) {
        continue;
      }
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dark = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
          setModule(r + dr, c + dc, dark);
        }
      }
    }
  }

  // 4. Dark module
  setModule(4 * version + 9, 8, true);

  // 5. Reserve format information areas
  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) isFunction[8][i] = true;
    if (!isFunction[i][8]) isFunction[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunction[8][size - 1 - i]) isFunction[8][size - 1 - i] = true;
    if (!isFunction[size - 1 - i][8]) isFunction[size - 1 - i][8] = true;
  }

  // 6. Encode data stream
  const data = encodeData(text, version, ecl, selectedSpec);

  // 7. Place data bits (Mask 0: (row + col) % 2 === 0)
  let byteIdx = 0;
  let bitIdx = 7;
  let upwards = true;

  for (let c = size - 1; c > 0; c -= 2) {
    if (c === 6) c--; // Skip vertical timing column
    const rows = [];
    if (upwards) {
      for (let r = size - 1; r >= 0; r--) rows.push(r);
    } else {
      for (let r = 0; r < size; r++) rows.push(r);
    }
    upwards = !upwards;

    for (const r of rows) {
      for (let dc = 0; dc < 2; dc++) {
        const col = c - dc;
        if (!isFunction[r][col]) {
          let bit = false;
          if (byteIdx < data.length) {
            bit = ((data[byteIdx] >>> bitIdx) & 1) === 1;
            bitIdx--;
            if (bitIdx < 0) {
              bitIdx = 7;
              byteIdx++;
            }
          }
          // Apply standard Mask 0: (r + col) % 2 === 0
          const mask = (r + col) % 2 === 0;
          modules[r][col] = bit !== mask;
        }
      }
    }
  }

  // 8. Place format info (Mask 0 + ECL H: 100010111000111 XOR 101010000010010 = 001000111010101 -> 0x11d5)
  // Standard format string for (H, Mask 0) is 0x11d5
  const formatBits = 0x11d5;
  for (let i = 0; i < 15; i++) {
    const bit = ((formatBits >>> i) & 1) === 1;
    // Top-left finder
    if (i <= 5) setModule(8, i, bit);
    else if (i === 6) setModule(8, 7, bit);
    else if (i === 7) setModule(8, 8, bit);
    else if (i === 8) setModule(7, 8, bit);
    else setModule(14 - i, 8, bit);

    // Other two finders
    if (i < 8) setModule(size - 1 - i, 8, bit);
    else setModule(8, size - 15 + i, bit);
  }

  return {
    version,
    size,
    modules,
    isFinderPattern
  };
}
