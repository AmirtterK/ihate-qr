// ISO/IEC 18004 Compliant QR Code Generator
// Complete, self-contained, zero external dependencies
// Generates 100% standards-compliant QR codes scannable by all smartphones

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

// QR Code Specifications for Versions 1 through 10
// [totalCodewords, ecCodewordsPerBlock, [numBlocks, dataCodewordsPerBlock][]]
interface RSBlockSpec {
  totalCodewords: number;
  ecPerBlock: number;
  blocks: [number, number][];
}

const RS_SPECS: Record<number, Record<ErrorCorrectionLevel, RSBlockSpec>> = {
  1: {
    L: { totalCodewords: 26, ecPerBlock: 7, blocks: [[1, 19]] },
    M: { totalCodewords: 26, ecPerBlock: 10, blocks: [[1, 16]] },
    Q: { totalCodewords: 26, ecPerBlock: 13, blocks: [[1, 13]] },
    H: { totalCodewords: 26, ecPerBlock: 17, blocks: [[1, 9]] },
  },
  2: {
    L: { totalCodewords: 44, ecPerBlock: 10, blocks: [[1, 34]] },
    M: { totalCodewords: 44, ecPerBlock: 16, blocks: [[1, 28]] },
    Q: { totalCodewords: 44, ecPerBlock: 22, blocks: [[1, 22]] },
    H: { totalCodewords: 44, ecPerBlock: 28, blocks: [[1, 16]] },
  },
  3: {
    L: { totalCodewords: 70, ecPerBlock: 15, blocks: [[1, 55]] },
    M: { totalCodewords: 70, ecPerBlock: 26, blocks: [[1, 44]] },
    Q: { totalCodewords: 70, ecPerBlock: 18, blocks: [[2, 17]] },
    H: { totalCodewords: 70, ecPerBlock: 22, blocks: [[2, 13]] },
  },
  4: {
    L: { totalCodewords: 100, ecPerBlock: 20, blocks: [[1, 80]] },
    M: { totalCodewords: 100, ecPerBlock: 18, blocks: [[2, 32]] },
    Q: { totalCodewords: 100, ecPerBlock: 26, blocks: [[2, 24]] },
    H: { totalCodewords: 100, ecPerBlock: 16, blocks: [[4, 9]] },
  },
  5: {
    L: { totalCodewords: 134, ecPerBlock: 26, blocks: [[1, 108]] },
    M: { totalCodewords: 134, ecPerBlock: 24, blocks: [[2, 43]] },
    Q: { totalCodewords: 134, ecPerBlock: 18, blocks: [[2, 15], [2, 16]] },
    H: { totalCodewords: 134, ecPerBlock: 22, blocks: [[2, 11], [2, 12]] },
  },
  6: {
    L: { totalCodewords: 172, ecPerBlock: 18, blocks: [[2, 68]] },
    M: { totalCodewords: 172, ecPerBlock: 16, blocks: [[4, 27]] },
    Q: { totalCodewords: 172, ecPerBlock: 24, blocks: [[4, 19]] },
    H: { totalCodewords: 172, ecPerBlock: 28, blocks: [[4, 15]] },
  },
  7: {
    L: { totalCodewords: 196, ecPerBlock: 20, blocks: [[2, 78]] },
    M: { totalCodewords: 196, ecPerBlock: 18, blocks: [[4, 31]] },
    Q: { totalCodewords: 196, ecPerBlock: 18, blocks: [[2, 14], [4, 15]] },
    H: { totalCodewords: 196, ecPerBlock: 26, blocks: [[4, 13], [1, 14]] },
  },
  8: {
    L: { totalCodewords: 242, ecPerBlock: 24, blocks: [[2, 97]] },
    M: { totalCodewords: 242, ecPerBlock: 22, blocks: [[2, 38], [2, 39]] },
    Q: { totalCodewords: 242, ecPerBlock: 22, blocks: [[4, 18], [2, 19]] },
    H: { totalCodewords: 242, ecPerBlock: 26, blocks: [[4, 14], [2, 15]] },
  },
  9: {
    L: { totalCodewords: 292, ecPerBlock: 30, blocks: [[2, 116]] },
    M: { totalCodewords: 292, ecPerBlock: 22, blocks: [[3, 36], [2, 37]] },
    Q: { totalCodewords: 292, ecPerBlock: 20, blocks: [[4, 16], [4, 17]] },
    H: { totalCodewords: 292, ecPerBlock: 24, blocks: [[4, 12], [4, 13]] },
  },
  10: {
    L: { totalCodewords: 346, ecPerBlock: 18, blocks: [[2, 68], [2, 69]] },
    M: { totalCodewords: 346, ecPerBlock: 26, blocks: [[4, 43], [1, 44]] },
    Q: { totalCodewords: 346, ecPerBlock: 24, blocks: [[6, 19], [2, 20]] },
    H: { totalCodewords: 346, ecPerBlock: 28, blocks: [[6, 15], [2, 16]] },
  },
};

// Alignment pattern centers per version
const ALIGNMENT_PATTERN_CENTERS: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

// Error correction level bits for format string: L=1 (01), M=0 (00), Q=3 (11), H=2 (10)
const ECL_BITS: Record<ErrorCorrectionLevel, number> = {
  L: 1,
  M: 0,
  Q: 3,
  H: 2,
};

// Galois Field GF(256)
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 256) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    EXP[i] = EXP[i - 255];
  }
})();

function gmult(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

// Reed-Solomon polynomial math
function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gmult(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

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

// BCH 15,5 calculation for format information
function getBCHTypeInfo(data: number): number {
  let d = data << 10;
  while (d >= (1 << 10)) {
    const msb = 31 - Math.clz32(d);
    d ^= (0x537 << (msb - 10));
  }
  return ((data << 10) | d) ^ 0x5412;
}

// BCH 18,6 calculation for version information (Version >= 7)
function getBCHTypeNumber(version: number): number {
  let d = version << 12;
  while (d >= (1 << 12)) {
    const msb = 31 - Math.clz32(d);
    d ^= (0x1f25 << (msb - 12));
  }
  return (version << 12) | d;
}

// Mask evaluation condition
function getMask(mask: number, r: number, c: number): boolean {
  switch (mask) {
    case 0: return (r + c) % 2 === 0;
    case 1: return r % 2 === 0;
    case 2: return c % 3 === 0;
    case 3: return (r + c) % 3 === 0;
    case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5: return ((r * c) % 2 + (r * c) % 3) === 0;
    case 6: return ((r * c) % 2 + (r * c) % 3) % 2 === 0;
    case 7: return ((r + c) % 2 + (r * c) % 3) % 2 === 0;
    default: return false;
  }
}

// Bit Buffer
class BitBuffer {
  buffer: number[] = [];
  length = 0;

  put(num: number, len: number) {
    for (let i = 0; i < len; i++) {
      this.putBit(((num >>> (len - i - 1)) & 1) === 1);
    }
  }

  putBit(bit: boolean) {
    const idx = this.length >>> 3;
    if (this.buffer.length <= idx) this.buffer.push(0);
    if (bit) this.buffer[idx] |= 0x80 >>> (this.length & 7);
    this.length++;
  }
}

// Encode payload in 8-bit byte mode and interleave blocks
function encodePayload(text: string, version: number, ecl: ErrorCorrectionLevel): Uint8Array {
  const spec = RS_SPECS[version][ecl];
  const bytes = new TextEncoder().encode(text);
  const bb = new BitBuffer();

  // Mode: 0100 (8-bit Byte)
  bb.put(0x04, 4);

  // Character count indicator: 8 bits for V1-9, 16 bits for V10+
  const countBits = version < 10 ? 8 : 16;
  bb.put(bytes.length, countBits);

  // Data bytes
  for (let i = 0; i < bytes.length; i++) {
    bb.put(bytes[i], 8);
  }

  // Total required data codewords
  let totalDataCW = 0;
  for (const [numBlocks, dcw] of spec.blocks) {
    totalDataCW += numBlocks * dcw;
  }
  const totalDataBits = totalDataCW * 8;

  // Terminator (up to 4 zeros)
  bb.put(0, Math.min(4, Math.max(0, totalDataBits - bb.length)));

  // Pad to byte boundary
  while (bb.length & 7) {
    bb.putBit(false);
  }

  // Pad bytes: alternating 0xEC and 0x11
  const pads = [0xec, 0x11];
  let pIdx = 0;
  while (bb.length < totalDataBits) {
    bb.put(pads[pIdx++ & 1], 8);
  }

  const rawData = new Uint8Array(bb.buffer);

  // Split into RS blocks and calculate error correction
  const blockData: Uint8Array[] = [];
  const blockEC: Uint8Array[] = [];
  let offset = 0;

  for (const [numBlocks, dcw] of spec.blocks) {
    for (let b = 0; b < numBlocks; b++) {
      const d = rawData.subarray(offset, offset + dcw);
      blockData.push(d);
      blockEC.push(rsCompute(d, spec.ecPerBlock));
      offset += dcw;
    }
  }

  // Interleave data codewords across all blocks
  const result = new Uint8Array(spec.totalCodewords);
  let outIdx = 0;

  let maxDataLen = 0;
  for (const b of blockData) {
    if (b.length > maxDataLen) maxDataLen = b.length;
  }

  for (let i = 0; i < maxDataLen; i++) {
    for (const b of blockData) {
      if (i < b.length) {
        result[outIdx++] = b[i];
      }
    }
  }

  // Interleave error correction codewords across all blocks
  for (let i = 0; i < spec.ecPerBlock; i++) {
    for (const ec of blockEC) {
      result[outIdx++] = ec[i];
    }
  }

  return result;
}

// Penalty calculation (ISO 18004 §8.8.2 / Kazuhiko Arase getLostPoint)
function calculatePenalty(modules: boolean[][], size: number): number {
  let penalty = 0;

  // Rule 1: adjacent modules with same color in row / column
  for (let r = 0; r < size; r++) {
    let sameCount = 0;
    for (let c = 0; c < size; c++) {
      if (c === 0 || modules[r][c] !== modules[r][c - 1]) {
        if (sameCount >= 5) penalty += 3 + (sameCount - 5);
        sameCount = 1;
      } else {
        sameCount++;
      }
    }
    if (sameCount >= 5) penalty += 3 + (sameCount - 5);
  }

  for (let c = 0; c < size; c++) {
    let sameCount = 0;
    for (let r = 0; r < size; r++) {
      if (r === 0 || modules[r][c] !== modules[r - 1][c]) {
        if (sameCount >= 5) penalty += 3 + (sameCount - 5);
        sameCount = 1;
      } else {
        sameCount++;
      }
    }
    if (sameCount >= 5) penalty += 3 + (sameCount - 5);
  }

  // Rule 2: 2x2 blocks of same color
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = modules[r][c];
      if (v === modules[r][c + 1] && v === modules[r + 1][c] && v === modules[r + 1][c + 1]) {
        penalty += 3;
      }
    }
  }

  // Rule 3: 1:1:3:1:1 pattern
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 7; c++) {
      if (
        modules[r][c] &&
        !modules[r][c + 1] &&
        modules[r][c + 2] &&
        modules[r][c + 3] &&
        modules[r][c + 4] &&
        !modules[r][c + 5] &&
        modules[r][c + 6]
      ) {
        if (c >= 4 && !modules[r][c - 1] && !modules[r][c - 2] && !modules[r][c - 3] && !modules[r][c - 4]) {
          penalty += 40;
        } else if (c + 7 + 4 <= size && !modules[r][c + 7] && !modules[r][c + 8] && !modules[r][c + 9] && !modules[r][c + 10]) {
          penalty += 40;
        }
      }
    }
  }

  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - 7; r++) {
      if (
        modules[r][c] &&
        !modules[r + 1][c] &&
        modules[r + 2][c] &&
        modules[r + 3][c] &&
        modules[r + 4][c] &&
        !modules[r + 5][c] &&
        modules[r + 6][c]
      ) {
        if (r >= 4 && !modules[r - 1][c] && !modules[r - 2][c] && !modules[r - 3][c] && !modules[r - 4][c]) {
          penalty += 40;
        } else if (r + 7 + 4 <= size && !modules[r + 7][c] && !modules[r + 8][c] && !modules[r + 9][c] && !modules[r + 10][c]) {
          penalty += 40;
        }
      }
    }
  }

  // Rule 4: dark module ratio
  let darkCount = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) darkCount++;
    }
  }
  const ratio = (darkCount * 100) / (size * size);
  const step = Math.abs(Math.floor(ratio / 5) - 10);
  penalty += step * 10;

  return penalty;
}

export interface QRCodeData {
  version: number;
  size: number;
  modules: boolean[][];
  isFinderPattern: boolean[][];
}

// Build matrix according to ISO 18004
function makeMatrix(
  version: number,
  ecl: ErrorCorrectionLevel,
  data: Uint8Array,
  mask: number
): { modules: boolean[][]; isFinderPattern: boolean[][] } {
  const size = version * 4 + 17;
  const modules: (boolean | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
  const isFinderPattern: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // 1. Position Probe Patterns (7x7 + 1-module white separator)
  function setupFinder(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const mr = row + r;
        const mc = col + c;
        if (mr < 0 || mr >= size || mc < 0 || mc >= size) continue;

        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
          isFinderPattern[mr][mc] = true;
          // 7x7 outer border or 3x3 inner core
          modules[mr][mc] =
            r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        } else {
          // Separator (white)
          modules[mr][mc] = false;
        }
      }
    }
  }

  setupFinder(0, 0);
  setupFinder(size - 7, 0);
  setupFinder(0, size - 7);

  // 2. Timing Patterns (Row 6 and Column 6)
  for (let i = 8; i < size - 8; i++) {
    if (modules[6][i] === null) modules[6][i] = i % 2 === 0;
    if (modules[i][6] === null) modules[i][6] = i % 2 === 0;
  }

  // 3. Alignment Patterns (for Version >= 2)
  const alignCenters = ALIGNMENT_PATTERN_CENTERS[version];
  for (let i = 0; i < alignCenters.length; i++) {
    for (let j = 0; j < alignCenters.length; j++) {
      const cr = alignCenters[i];
      const cc = alignCenters[j];

      // Skip if overlaps finder pattern
      if (
        (cr <= 8 && cc <= 8) ||
        (cr <= 8 && cc >= size - 8) ||
        (cr >= size - 8 && cc <= 8)
      ) {
        continue;
      }

      // Draw 5x5 alignment pattern
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          modules[cr + r][cc + c] =
            Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
        }
      }
    }
  }

  // 4. Version Information (for Version >= 7)
  if (version >= 7) {
    const versionBits = getBCHTypeNumber(version);
    for (let i = 0; i < 18; i++) {
      const bit = ((versionBits >> i) & 1) === 1;
      const r = Math.floor(i / 3);
      const c = (i % 3) + size - 11;
      modules[r][c] = bit;
      modules[c][r] = bit;
    }
  }

  // 5. Format Information
  const formatData = (ECL_BITS[ecl] << 3) | mask;
  const formatBits = getBCHTypeInfo(formatData);

  for (let i = 0; i < 15; i++) {
    const bit = ((formatBits >> i) & 1) === 1;

    // Vertical placement
    if (i < 6) {
      modules[i][8] = bit;
    } else if (i < 8) {
      modules[i + 1][8] = bit; // skips timing row 6
    } else {
      modules[size - 15 + i][8] = bit;
    }

    // Horizontal placement
    if (i < 8) {
      modules[8][size - i - 1] = bit;
    } else if (i < 9) {
      modules[8][15 - i] = bit; // column 7
    } else {
      modules[8][15 - i - 1] = bit; // skips timing column 6
    }
  }

  // Fixed Dark Module
  modules[size - 8][8] = true;

  // 6. Map Data with Mask
  let inc = -1;
  let row = size - 1;
  let bitIndex = 7;
  let byteIndex = 0;

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--; // skip timing column

    while (true) {
      for (let c = 0; c < 2; c++) {
        const mc = col - c;
        if (modules[row][mc] === null) {
          let dark = false;
          if (byteIndex < data.length) {
            dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
          }

          if (getMask(mask, row, mc)) {
            dark = !dark;
          }

          modules[row][mc] = dark;
          bitIndex--;
          if (bitIndex === -1) {
            byteIndex++;
            bitIndex = 7;
          }
        }
      }

      row += inc;
      if (row < 0 || size <= row) {
        row -= inc;
        inc = -inc;
        break;
      }
    }
  }

  return {
    modules: modules.map((r) => r.map((c) => c ?? false)),
    isFinderPattern,
  };
}

// Main generator export
export function generateQRMatrix(text: string, ecl: ErrorCorrectionLevel = 'H'): QRCodeData {
  const bytes = new TextEncoder().encode(text);

  // Find minimum version (1 to 10) that can accommodate payload
  let version = 1;
  for (let v = 1; v <= 10; v++) {
    const spec = RS_SPECS[v][ecl];
    let totalDataCW = 0;
    for (const [numBlocks, dcw] of spec.blocks) {
      totalDataCW += numBlocks * dcw;
    }
    const headerBits = 4 + (v < 10 ? 8 : 16);
    const maxDataBytes = Math.floor((totalDataCW * 8 - headerBits) / 8);
    if (bytes.length <= maxDataBytes) {
      version = v;
      break;
    }
    if (v === 10) {
      version = 10;
    }
  }

  const data = encodePayload(text, version, ecl);
  const size = version * 4 + 17;

  // Evaluate all 8 masks and pick the one with lowest penalty score
  let bestMask = 0;
  let minPenalty = Infinity;
  let bestResult = makeMatrix(version, ecl, data, 0);

  for (let mask = 0; mask < 8; mask++) {
    const res = makeMatrix(version, ecl, data, mask);
    const penalty = calculatePenalty(res.modules, size);
    if (penalty < minPenalty) {
      minPenalty = penalty;
      bestMask = mask;
      bestResult = res;
    }
  }

  return {
    version,
    size,
    modules: bestResult.modules,
    isFinderPattern: bestResult.isFinderPattern,
  };
}
