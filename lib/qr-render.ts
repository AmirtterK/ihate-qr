import { QRCodeData } from "@/lib/qr-code";
import {
  FinderShape,
  EyePupilShape,
  ModuleShape,
  ColorMode,
  LogoBacking,
  CodeContainer,
} from "@/lib/qr-types";

// Helper: Hex to RGB
export function hexToRgb(hex: string): [number, number, number] {
  if (hex.toLowerCase() === "transparent") {
    return [255, 255, 255];
  }
  let cleaned = hex.replace("#", "").trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split("").map((c) => c + c).join("");
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return [0, 0, 0];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// Helper: Relative Luminance (WCAG)
export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Helper: Contrast Ratio
export function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const l1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const l2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Seeded PRNG (Mulberry32)
export function createRng(seedStr: string) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = (Math.imul(31, h) + seedStr.charCodeAt(i)) | 0;
  }
  let a = h >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Bulletproof Canvas rounded rectangle with per-corner radii
export function drawRoundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  tl: number,
  tr: number,
  br: number,
  bl: number
) {
  const maxR = Math.min(w, h) / 2;
  const ctl = Math.max(0, Math.min(tl, maxR));
  const ctr = Math.max(0, Math.min(tr, maxR));
  const cbr = Math.max(0, Math.min(br, maxR));
  const cbl = Math.max(0, Math.min(bl, maxR));

  ctx.beginPath();
  ctx.moveTo(x + ctl, y);
  ctx.lineTo(x + w - ctr, y);
  if (ctr > 0) ctx.arcTo(x + w, y, x + w, y + ctr, ctr);
  ctx.lineTo(x + w, y + h - cbr);
  if (cbr > 0) ctx.arcTo(x + w, y + h, x + w - cbr, y + h, cbr);
  ctx.lineTo(x + cbl, y + h);
  if (cbl > 0) ctx.arcTo(x, y + h, x, y + h - cbl, cbl);
  ctx.lineTo(x, y + ctl);
  if (ctl > 0) ctx.arcTo(x, y, x + ctl, y, ctl);
  ctx.closePath();
}

// Generate exact SVG path for a rectangle with individual corner radii
export function getSvgRoundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  tl: number,
  tr: number,
  br: number,
  bl: number
): string {
  const maxR = Math.min(w, h) / 2;
  const ctl = Math.max(0, Math.min(tl, maxR));
  const ctr = Math.max(0, Math.min(tr, maxR));
  const cbr = Math.max(0, Math.min(br, maxR));
  const cbl = Math.max(0, Math.min(bl, maxR));

  return (
    `M ${(x + ctl).toFixed(2)} ${y.toFixed(2)} ` +
    `L ${(x + w - ctr).toFixed(2)} ${y.toFixed(2)} ` +
    (ctr > 0 ? `A ${ctr.toFixed(2)} ${ctr.toFixed(2)} 0 0 1 ${(x + w).toFixed(2)} ${(y + ctr).toFixed(2)} ` : "") +
    `L ${(x + w).toFixed(2)} ${(y + h - cbr).toFixed(2)} ` +
    (cbr > 0 ? `A ${cbr.toFixed(2)} ${cbr.toFixed(2)} 0 0 1 ${(x + w - cbr).toFixed(2)} ${(y + h).toFixed(2)} ` : "") +
    `L ${(x + cbl).toFixed(2)} ${(y + h).toFixed(2)} ` +
    (cbl > 0 ? `A ${cbl.toFixed(2)} ${cbl.toFixed(2)} 0 0 1 ${x.toFixed(2)} ${(y + h - cbl).toFixed(2)} ` : "") +
    `L ${x.toFixed(2)} ${(y + ctl).toFixed(2)} ` +
    (ctl > 0 ? `A ${ctl.toFixed(2)} ${ctl.toFixed(2)} 0 0 1 ${(x + ctl).toFixed(2)} ${y.toFixed(2)} ` : "") +
    "Z"
  );
}

// Natural pupil pairing resolution
export function resolvePupilShape(frameShape: FinderShape, pupilShape?: EyePupilShape): EyePupilShape {
  if (pupilShape && pupilShape !== "auto") return pupilShape;
  switch (frameShape) {
    case "circle":
    case "teardrop":
    case "clover":
    case "concentric":
      return "circle";
    case "leaf":
      return "leaf";
    case "chamfer":
      return "chamfer";
    case "rounded":
      return "rounded";
    case "diamond":
      return "diamond";
    case "hexagon":
    case "gear":
      return "hexagon";
    case "shield":
      return "shield";
    case "star":
      return "star";
    case "viewfinder":
      return "cross";
    case "heart":
      return "heart";
    default:
      return "square";
  }
}

// Draw pupil shape onto Canvas (3x3 modules region)
export function drawPupilOnCanvas(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  pupilSize: number,
  resolvedPupil: EyePupilShape,
  color: string,
  corner: "tl" | "tr" | "bl",
  modSize: number
) {
  ctx.fillStyle = color;
  const half = pupilSize / 2;
  const ox = cx - half;
  const oy = cy - half;

  if (resolvedPupil === "circle") {
    ctx.beginPath();
    ctx.arc(cx, cy, half, 0, Math.PI * 2);
    ctx.fill();
  } else if (resolvedPupil === "rounded") {
    const rad = pupilSize * 0.35;
    drawRoundRectPath(ctx, ox, oy, pupilSize, pupilSize, rad, rad, rad, rad);
    ctx.fill();
  } else if (resolvedPupil === "diamond") {
    ctx.beginPath();
    ctx.moveTo(cx, oy);
    ctx.lineTo(ox + pupilSize, cy);
    ctx.lineTo(cx, oy + pupilSize);
    ctx.lineTo(ox, cy);
    ctx.closePath();
    ctx.fill();
  } else if (resolvedPupil === "star") {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * i) / 5 - Math.PI / 2;
      const r = i % 2 === 0 ? half : half * 0.42;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  } else if (resolvedPupil === "heart") {
    const s = pupilSize * 0.46;
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.8);
    ctx.bezierCurveTo(cx - s * 1.3, cy + s * 0.15, cx - s * 1.25, cy - s * 0.8, cx, cy - s * 0.25);
    ctx.bezierCurveTo(cx + s * 1.25, cy - s * 0.8, cx + s * 1.3, cy + s * 0.15, cx, cy + s * 0.8);
    ctx.closePath();
    ctx.fill();
  } else if (resolvedPupil === "cross") {
    const arm = pupilSize * 0.3;
    ctx.fillRect(ox + arm, oy, pupilSize - arm * 2, pupilSize);
    ctx.fillRect(ox, oy + arm, pupilSize, pupilSize - arm * 2);
  } else if (resolvedPupil === "leaf") {
    const rPup = 0.9 * modSize;
    let tlP = rPup, trP = 0, brP = rPup, blP = 0;
    if (corner === "tr" || corner === "bl") {
      tlP = 0; trP = rPup; brP = 0; blP = rPup;
    }
    drawRoundRectPath(ctx, ox, oy, pupilSize, pupilSize, tlP, trP, brP, blP);
    ctx.fill();
  } else if (resolvedPupil === "chamfer") {
    const ch = 0.7 * modSize;
    ctx.beginPath();
    ctx.moveTo(ox + ch, oy);
    ctx.lineTo(ox + pupilSize - ch, oy);
    ctx.lineTo(ox + pupilSize, oy + ch);
    ctx.lineTo(ox + pupilSize, oy + pupilSize - ch);
    ctx.lineTo(ox + pupilSize - ch, oy + pupilSize);
    ctx.lineTo(ox + ch, oy + pupilSize);
    ctx.lineTo(ox, oy + pupilSize - ch);
    ctx.lineTo(ox, oy + ch);
    ctx.closePath();
    ctx.fill();
  } else if (resolvedPupil === "hexagon") {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = cx + Math.cos(angle) * half;
      const py = cy + Math.sin(angle) * half;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  } else if (resolvedPupil === "shield") {
    const r = pupilSize * 0.2;
    ctx.beginPath();
    ctx.moveTo(ox + r, oy);
    ctx.lineTo(ox + pupilSize - r, oy);
    ctx.arcTo(ox + pupilSize, oy, ox + pupilSize, oy + r, r);
    ctx.lineTo(ox + pupilSize, oy + pupilSize * 0.55);
    ctx.quadraticCurveTo(ox + pupilSize, oy + pupilSize * 0.85, ox + pupilSize / 2, oy + pupilSize);
    ctx.quadraticCurveTo(ox, oy + pupilSize * 0.85, ox, oy + pupilSize * 0.55);
    ctx.lineTo(ox, oy + r);
    ctx.arcTo(ox, oy, ox + r, oy, r);
    ctx.closePath();
    ctx.fill();
  } else {
    // Square
    ctx.fillRect(ox, oy, pupilSize, pupilSize);
  }
}

// Generate SVG string for the pupil (3x3 region)
export function getPupilSvg(
  cx: number,
  cy: number,
  pupilSize: number,
  resolvedPupil: EyePupilShape,
  color: string,
  corner: "tl" | "tr" | "bl",
  modSize: number
): string {
  const half = pupilSize / 2;
  const ox = cx - half;
  const oy = cy - half;

  if (resolvedPupil === "circle") {
    return `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${half.toFixed(2)}" fill="${color}" />`;
  } else if (resolvedPupil === "rounded") {
    const rad = pupilSize * 0.35;
    const p = getSvgRoundedRectPath(ox, oy, pupilSize, pupilSize, rad, rad, rad, rad);
    return `<path d="${p}" fill="${color}" />`;
  } else if (resolvedPupil === "diamond") {
    return `<polygon points="${cx.toFixed(2)},${oy.toFixed(2)} ${(ox + pupilSize).toFixed(2)},${cy.toFixed(2)} ${cx.toFixed(2)},${(oy + pupilSize).toFixed(2)} ${ox.toFixed(2)},${cy.toFixed(2)}" fill="${color}" />`;
  } else if (resolvedPupil === "star") {
    let pts = "";
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * i) / 5 - Math.PI / 2;
      const r = i % 2 === 0 ? half : half * 0.42;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      pts += `${px.toFixed(2)},${py.toFixed(2)} `;
    }
    return `<polygon points="${pts.trim()}" fill="${color}" />`;
  } else if (resolvedPupil === "heart") {
    const s = pupilSize * 0.46;
    return `<path d="M ${cx.toFixed(2)} ${(cy + s * 0.8).toFixed(2)} C ${(cx - s * 1.3).toFixed(2)} ${(cy + s * 0.15).toFixed(2)} ${(cx - s * 1.25).toFixed(2)} ${(cy - s * 0.8).toFixed(2)} ${cx.toFixed(2)} ${(cy - s * 0.25).toFixed(2)} C ${(cx + s * 1.25).toFixed(2)} ${(cy - s * 0.8).toFixed(2)} ${(cx + s * 1.3).toFixed(2)} ${(cy + s * 0.15).toFixed(2)} ${cx.toFixed(2)} ${(cy + s * 0.8).toFixed(2)} Z" fill="${color}" />`;
  } else if (resolvedPupil === "cross") {
    const arm = pupilSize * 0.3;
    return `
      <rect x="${(ox + arm).toFixed(2)}" y="${oy.toFixed(2)}" width="${(pupilSize - arm * 2).toFixed(2)}" height="${pupilSize.toFixed(2)}" fill="${color}" />
      <rect x="${ox.toFixed(2)}" y="${(oy + arm).toFixed(2)}" width="${pupilSize.toFixed(2)}" height="${(pupilSize - arm * 2).toFixed(2)}" fill="${color}" />
    `;
  } else if (resolvedPupil === "leaf") {
    const rPup = 0.9 * modSize;
    let tlP = rPup, trP = 0, brP = rPup, blP = 0;
    if (corner === "tr" || corner === "bl") {
      tlP = 0; trP = rPup; brP = 0; blP = rPup;
    }
    const p = getSvgRoundedRectPath(ox, oy, pupilSize, pupilSize, tlP, trP, brP, blP);
    return `<path d="${p}" fill="${color}" />`;
  } else if (resolvedPupil === "chamfer") {
    const ch = 0.7 * modSize;
    const pts = `${(ox + ch).toFixed(2)},${oy.toFixed(2)} ${(ox + pupilSize - ch).toFixed(2)},${oy.toFixed(2)} ${(ox + pupilSize).toFixed(2)},${(oy + ch).toFixed(2)} ${(ox + pupilSize).toFixed(2)},${(oy + pupilSize - ch).toFixed(2)} ${(ox + pupilSize - ch).toFixed(2)},${(oy + pupilSize).toFixed(2)} ${(ox + ch).toFixed(2)},${(oy + pupilSize).toFixed(2)} ${ox.toFixed(2)},${(oy + pupilSize - ch).toFixed(2)} ${ox.toFixed(2)},${(oy + ch).toFixed(2)}`;
    return `<polygon points="${pts}" fill="${color}" />`;
  } else if (resolvedPupil === "hexagon") {
    let pts = "";
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = cx + Math.cos(angle) * half;
      const py = cy + Math.sin(angle) * half;
      pts += `${px.toFixed(2)},${py.toFixed(2)} `;
    }
    return `<polygon points="${pts.trim()}" fill="${color}" />`;
  } else if (resolvedPupil === "shield") {
    const r = pupilSize * 0.2;
    const d = `M ${(ox + r).toFixed(2)} ${oy.toFixed(2)} L ${(ox + pupilSize - r).toFixed(2)} ${oy.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${(ox + pupilSize).toFixed(2)} ${(oy + r).toFixed(2)} L ${(ox + pupilSize).toFixed(2)} ${(oy + pupilSize * 0.55).toFixed(2)} Q ${(ox + pupilSize).toFixed(2)} ${(oy + pupilSize * 0.85).toFixed(2)} ${(ox + pupilSize / 2).toFixed(2)} ${(oy + pupilSize).toFixed(2)} Q ${ox.toFixed(2)} ${(oy + pupilSize * 0.85).toFixed(2)} ${ox.toFixed(2)} ${(oy + pupilSize * 0.55).toFixed(2)} L ${ox.toFixed(2)} ${(oy + r).toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${(ox + r).toFixed(2)} ${oy.toFixed(2)} Z`;
    return `<path d="${d}" fill="${color}" />`;
  } else {
    return `<rect x="${ox.toFixed(2)}" y="${oy.toFixed(2)}" width="${pupilSize.toFixed(2)}" height="${pupilSize.toFixed(2)}" fill="${color}" />`;
  }
}

// Draw a custom artistic finder eye pattern (7x7 modules) onto Canvas
export function drawFinderEye(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  modSize: number,
  shape: FinderShape,
  color: string,
  bgColor: string,
  corner: "tl" | "tr" | "bl",
  pupilShape: EyePupilShape = "auto"
) {
  const outerSize = 7 * modSize;
  const innerSize = 5 * modSize;
  const pupilSize = 3 * modSize;
  const innerOffset = modSize;

  const cx = originX + outerSize / 2;
  const cy = originY + outerSize / 2;
  const isTransparent = bgColor.toLowerCase() === "transparent";

  ctx.save();

  if (shape === "circle") {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, outerSize / 2, 0, Math.PI * 2);
    ctx.fill();

    if (isTransparent) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(cx, cy, innerSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.arc(cx, cy, innerSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (shape === "leaf") {
    const rOut = 2.4 * modSize;
    const rIn = 1.6 * modSize;
    let tlO = rOut, trO = 0, brO = rOut, blO = 0;
    let tlI = rIn, trI = 0, brI = rIn, blI = 0;

    if (corner === "tr" || corner === "bl") {
      tlO = 0; trO = rOut; brO = 0; blO = rOut;
      tlI = 0; trI = rIn; brI = 0; blI = rIn;
    }

    ctx.fillStyle = color;
    drawRoundRectPath(ctx, originX, originY, outerSize, outerSize, tlO, trO, brO, blO);
    ctx.fill();

    if (isTransparent) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      drawRoundRectPath(ctx, originX + innerOffset, originY + innerOffset, innerSize, innerSize, tlI, trI, brI, blI);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = bgColor;
      drawRoundRectPath(ctx, originX + innerOffset, originY + innerOffset, innerSize, innerSize, tlI, trI, brI, blI);
      ctx.fill();
    }
  } else if (shape === "chamfer") {
    const chOut = 1.7 * modSize;
    const chIn = 1.1 * modSize;

    const chamferPath = (ox: number, oy: number, sz: number, ch: number) => {
      ctx.beginPath();
      ctx.moveTo(ox + ch, oy);
      ctx.lineTo(ox + sz - ch, oy);
      ctx.lineTo(ox + sz, oy + ch);
      ctx.lineTo(ox + sz, oy + sz - ch);
      ctx.lineTo(ox + sz - ch, oy + sz);
      ctx.lineTo(ox + ch, oy + sz);
      ctx.lineTo(ox, oy + sz - ch);
      ctx.lineTo(ox, oy + ch);
      ctx.closePath();
    };

    ctx.fillStyle = color;
    chamferPath(originX, originY, outerSize, chOut);
    ctx.fill();

    if (isTransparent) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      chamferPath(originX + innerOffset, originY + innerOffset, innerSize, chIn);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = bgColor;
      chamferPath(originX + innerOffset, originY + innerOffset, innerSize, chIn);
      ctx.fill();
    }
  } else if (shape === "rounded") {
    const rOut = outerSize * 0.38;
    const rIn = innerSize * 0.35;

    ctx.fillStyle = color;
    drawRoundRectPath(ctx, originX, originY, outerSize, outerSize, rOut, rOut, rOut, rOut);
    ctx.fill();

    if (isTransparent) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      drawRoundRectPath(ctx, originX + innerOffset, originY + innerOffset, innerSize, innerSize, rIn, rIn, rIn, rIn);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = bgColor;
      drawRoundRectPath(ctx, originX + innerOffset, originY + innerOffset, innerSize, innerSize, rIn, rIn, rIn, rIn);
      ctx.fill();
    }
  } else if (shape === "diamond") {
    const drawDiamond = (ox: number, oy: number, sz: number) => {
      const half = sz / 2;
      ctx.beginPath();
      ctx.moveTo(ox + half, oy);
      ctx.lineTo(ox + sz, oy + half);
      ctx.lineTo(ox + half, oy + sz);
      ctx.lineTo(ox, oy + half);
      ctx.closePath();
    };

    ctx.fillStyle = color;
    drawDiamond(originX, originY, outerSize);
    ctx.fill();

    if (isTransparent) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      drawDiamond(originX + innerOffset, originY + innerOffset, innerSize);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = bgColor;
      drawDiamond(originX + innerOffset, originY + innerOffset, innerSize);
      ctx.fill();
    }
  } else if (shape === "hexagon") {
    const drawHex = (ox: number, oy: number, sz: number) => {
      const hh = sz / 2;
      const inset = sz * 0.25;
      ctx.beginPath();
      ctx.moveTo(ox + inset, oy);
      ctx.lineTo(ox + sz - inset, oy);
      ctx.lineTo(ox + sz, oy + hh);
      ctx.lineTo(ox + sz - inset, oy + sz);
      ctx.lineTo(ox + inset, oy + sz);
      ctx.lineTo(ox, oy + hh);
      ctx.closePath();
    };

    ctx.fillStyle = color;
    drawHex(originX, originY, outerSize);
    ctx.fill();

    if (isTransparent) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      drawHex(originX + innerOffset, originY + innerOffset, innerSize);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = bgColor;
      drawHex(originX + innerOffset, originY + innerOffset, innerSize);
      ctx.fill();
    }
  } else if (shape === "shield") {
    const drawShield = (ox: number, oy: number, sz: number) => {
      const r = sz * 0.2;
      ctx.beginPath();
      ctx.moveTo(ox + r, oy);
      ctx.lineTo(ox + sz - r, oy);
      ctx.arcTo(ox + sz, oy, ox + sz, oy + r, r);
      ctx.lineTo(ox + sz, oy + sz * 0.55);
      ctx.quadraticCurveTo(ox + sz, oy + sz * 0.85, ox + sz / 2, oy + sz);
      ctx.quadraticCurveTo(ox, oy + sz * 0.85, ox, oy + sz * 0.55);
      ctx.lineTo(ox, oy + r);
      ctx.arcTo(ox, oy, ox + r, oy, r);
      ctx.closePath();
    };

    ctx.fillStyle = color;
    drawShield(originX, originY, outerSize);
    ctx.fill();

    if (isTransparent) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      drawShield(originX + innerOffset, originY + innerOffset, innerSize);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = bgColor;
      drawShield(originX + innerOffset, originY + innerOffset, innerSize);
      ctx.fill();
    }
  } else if (shape === "star") {
    const drawStar = (centerX: number, centerY: number, outerR: number, innerR: number, points: number) => {
      ctx.beginPath();
      for (let i = 0; i < points * 2; i++) {
        const angle = (Math.PI * i) / points - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        const px = centerX + Math.cos(angle) * r;
        const py = centerY + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

    ctx.fillStyle = color;
    drawStar(cx, cy, outerSize / 2, outerSize * 0.22, 5);
    ctx.fill();

    if (isTransparent) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(cx, cy, innerSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.arc(cx, cy, innerSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (shape === "viewfinder") {
    // 4 corner L-brackets framing the pupil like a camera HUD
    const arm = 2.2 * modSize;
    const thick = modSize;
    ctx.fillStyle = color;
    // Top-left
    ctx.fillRect(originX, originY, arm, thick);
    ctx.fillRect(originX, originY, thick, arm);
    // Top-right
    ctx.fillRect(originX + outerSize - arm, originY, arm, thick);
    ctx.fillRect(originX + outerSize - thick, originY, thick, arm);
    // Bottom-left
    ctx.fillRect(originX, originY + outerSize - thick, arm, thick);
    ctx.fillRect(originX, originY + outerSize - arm, thick, arm);
    // Bottom-right
    ctx.fillRect(originX + outerSize - arm, originY + outerSize - thick, arm, thick);
    ctx.fillRect(originX + outerSize - thick, originY + outerSize - arm, thick, arm);
  } else if (shape === "heart") {
    const drawHeart = (hx: number, hy: number, s: number) => {
      ctx.beginPath();
      ctx.moveTo(hx, hy + s * 0.8);
      ctx.bezierCurveTo(hx - s * 1.3, hy + s * 0.15, hx - s * 1.25, hy - s * 0.8, hx, hy - s * 0.25);
      ctx.bezierCurveTo(hx + s * 1.25, hy - s * 0.8, hx + s * 1.3, hy + s * 0.15, hx, hy + s * 0.8);
      ctx.closePath();
    };

    ctx.fillStyle = color;
    drawHeart(cx, cy, outerSize * 0.46);
    ctx.fill();

    if (isTransparent) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      drawHeart(cx, cy, innerSize * 0.44);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = bgColor;
      drawHeart(cx, cy, innerSize * 0.44);
      ctx.fill();
    }
  } else if (shape === "teardrop") {
    // Map-pin / teardrop: 3 rounded corners, 1 corner pointing inward towards QR center
    const rOut = 2.5 * modSize;
    const rIn = 1.7 * modSize;
    let tlO = rOut, trO = rOut, brO = rOut, blO = rOut;
    let tlI = rIn, trI = rIn, brI = rIn, blI = rIn;

    if (corner === "tl") {
      brO = 0; brI = 0;
    } else if (corner === "tr") {
      blO = 0; blI = 0;
    } else {
      trO = 0; trI = 0;
    }

    ctx.fillStyle = color;
    drawRoundRectPath(ctx, originX, originY, outerSize, outerSize, tlO, trO, brO, blO);
    ctx.fill();

    if (isTransparent) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      drawRoundRectPath(ctx, originX + innerOffset, originY + innerOffset, innerSize, innerSize, tlI, trI, brI, blI);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = bgColor;
      drawRoundRectPath(ctx, originX + innerOffset, originY + innerOffset, innerSize, innerSize, tlI, trI, brI, blI);
      ctx.fill();
    }
  } else if (shape === "clover") {
    // 4-leaf clover / flower petal lobes
    const rLobe = 2.1 * modSize;
    const dLobe = 1.35 * modSize;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy - dLobe, rLobe, 0, Math.PI * 2);
    ctx.arc(cx + dLobe, cy, rLobe, 0, Math.PI * 2);
    ctx.arc(cx, cy + dLobe, rLobe, 0, Math.PI * 2);
    ctx.arc(cx - dLobe, cy, rLobe, 0, Math.PI * 2);
    ctx.fill();

    if (isTransparent) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(cx, cy, innerSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.arc(cx, cy, innerSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (shape === "gear") {
    // 8-tooth gear outer
    const points = 16;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < points; i++) {
      const angle = (Math.PI * 2 * i) / points;
      const r = i % 2 === 0 ? outerSize * 0.5 : outerSize * 0.42;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    if (isTransparent) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(cx, cy, innerSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.arc(cx, cy, innerSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (shape === "concentric") {
    // Concentric target radar rings
    ctx.fillStyle = color;
    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, outerSize / 2, 0, Math.PI * 2);
    ctx.arc(cx, cy, 2.7 * modSize, 0, Math.PI * 2, true);
    ctx.fill();
    // Inner ring
    ctx.beginPath();
    ctx.arc(cx, cy, 2.3 * modSize, 0, Math.PI * 2);
    ctx.arc(cx, cy, 1.8 * modSize, 0, Math.PI * 2, true);
    ctx.fill();
  } else {
    // Standard square
    ctx.fillStyle = color;
    ctx.fillRect(originX, originY, outerSize, outerSize);

    if (isTransparent) {
      ctx.clearRect(originX + innerOffset, originY + innerOffset, innerSize, innerSize);
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(originX + innerOffset, originY + innerOffset, innerSize, innerSize);
    }
  }

  // Draw independent pupil
  const resolved = resolvePupilShape(shape, pupilShape);
  drawPupilOnCanvas(ctx, cx, cy, pupilSize, resolved, color, corner, modSize);

  ctx.restore();
}

// Generate SVG string for an artistic finder eye
export function getFinderEyeSvg(
  originX: number,
  originY: number,
  modSize: number,
  shape: FinderShape,
  color: string,
  bgColor: string,
  corner: "tl" | "tr" | "bl",
  pupilShape: EyePupilShape = "auto"
): string {
  const outerSize = 7 * modSize;
  const innerSize = 5 * modSize;
  const pupilSize = 3 * modSize;
  const innerOffset = modSize;

  const cxNum = originX + 3.5 * modSize;
  const cyNum = originY + 3.5 * modSize;
  const cx = cxNum.toFixed(2);
  const cy = cyNum.toFixed(2);
  const isTransparent = bgColor.toLowerCase() === "transparent";

  const resolved = resolvePupilShape(shape, pupilShape);
  const pupilSvg = getPupilSvg(cxNum, cyNum, pupilSize, resolved, color, corner, modSize);

  let frameSvg = "";

  if (shape === "circle") {
    const rOut = (3.5 * modSize).toFixed(2);
    const rIn = (2.5 * modSize).toFixed(2);
    if (isTransparent) {
      frameSvg = `<path d="M ${cxNum} ${(cyNum - 3.5 * modSize).toFixed(2)} A ${rOut} ${rOut} 0 1 0 ${cxNum} ${(cyNum + 3.5 * modSize).toFixed(2)} A ${rOut} ${rOut} 0 1 0 ${cxNum} ${(cyNum - 3.5 * modSize).toFixed(2)} Z M ${cxNum} ${(cyNum - 2.5 * modSize).toFixed(2)} A ${rIn} ${rIn} 0 1 1 ${cxNum} ${(cyNum + 2.5 * modSize).toFixed(2)} A ${rIn} ${rIn} 0 1 1 ${cxNum} ${(cyNum - 2.5 * modSize).toFixed(2)} Z" fill="${color}" fill-rule="evenodd" />`;
    } else {
      frameSvg = `
        <circle cx="${cx}" cy="${cy}" r="${rOut}" fill="${color}" />
        <circle cx="${cx}" cy="${cy}" r="${rIn}" fill="${bgColor}" />
      `;
    }
  } else if (shape === "leaf") {
    const rOut = 2.4 * modSize;
    const rIn = 1.6 * modSize;
    let tlO = rOut, trO = 0, brO = rOut, blO = 0;
    let tlI = rIn, trI = 0, brI = rIn, blI = 0;

    if (corner === "tr" || corner === "bl") {
      tlO = 0; trO = rOut; brO = 0; blO = rOut;
      tlI = 0; trI = rIn; brI = 0; blI = rIn;
    }

    const pOut = getSvgRoundedRectPath(originX, originY, outerSize, outerSize, tlO, trO, brO, blO);
    const pIn = getSvgRoundedRectPath(originX + innerOffset, originY + innerOffset, innerSize, innerSize, tlI, trI, brI, blI);

    if (isTransparent) {
      frameSvg = `<path d="${pOut} ${pIn}" fill="${color}" fill-rule="evenodd" />`;
    } else {
      frameSvg = `
        <path d="${pOut}" fill="${color}" />
        <path d="${pIn}" fill="${bgColor}" />
      `;
    }
  } else if (shape === "chamfer") {
    const ox = originX;
    const oy = originY;
    const sz = outerSize;
    const ch = 1.7 * modSize;
    const pOut = `M ${(ox + ch).toFixed(2)} ${oy.toFixed(2)} L ${(ox + sz - ch).toFixed(2)} ${oy.toFixed(2)} L ${(ox + sz).toFixed(2)} ${(oy + ch).toFixed(2)} L ${(ox + sz).toFixed(2)} ${(oy + sz - ch).toFixed(2)} L ${(ox + sz - ch).toFixed(2)} ${(oy + sz).toFixed(2)} L ${(ox + ch).toFixed(2)} ${(oy + sz).toFixed(2)} L ${ox.toFixed(2)} ${(oy + sz - ch).toFixed(2)} L ${ox.toFixed(2)} ${(oy + ch).toFixed(2)} Z`;

    const iox = originX + innerOffset;
    const ioy = originY + innerOffset;
    const isz = innerSize;
    const ich = 1.1 * modSize;
    const pIn = `M ${(iox + ich).toFixed(2)} ${ioy.toFixed(2)} L ${(iox + isz - ich).toFixed(2)} ${ioy.toFixed(2)} L ${(iox + isz).toFixed(2)} ${(ioy + ich).toFixed(2)} L ${(iox + isz).toFixed(2)} ${(ioy + isz - ich).toFixed(2)} L ${(iox + isz - ich).toFixed(2)} ${(ioy + isz).toFixed(2)} L ${(iox + ich).toFixed(2)} ${(ioy + isz).toFixed(2)} L ${iox.toFixed(2)} ${(ioy + isz - ich).toFixed(2)} L ${iox.toFixed(2)} ${(ioy + ich).toFixed(2)} Z`;

    if (isTransparent) {
      frameSvg = `<path d="${pOut} ${pIn}" fill="${color}" fill-rule="evenodd" />`;
    } else {
      frameSvg = `
        <path d="${pOut}" fill="${color}" />
        <path d="${pIn}" fill="${bgColor}" />
      `;
    }
  } else if (shape === "rounded") {
    const pOut = getSvgRoundedRectPath(originX, originY, outerSize, outerSize, outerSize * 0.38, outerSize * 0.38, outerSize * 0.38, outerSize * 0.38);
    const pIn = getSvgRoundedRectPath(originX + innerOffset, originY + innerOffset, innerSize, innerSize, innerSize * 0.35, innerSize * 0.35, innerSize * 0.35, innerSize * 0.35);

    if (isTransparent) {
      frameSvg = `<path d="${pOut} ${pIn}" fill="${color}" fill-rule="evenodd" />`;
    } else {
      frameSvg = `
        <path d="${pOut}" fill="${color}" />
        <path d="${pIn}" fill="${bgColor}" />
      `;
    }
  } else if (shape === "diamond") {
    const svgDiamond = (ox: number, oy: number, sz: number) => {
      const half = sz / 2;
      return `M ${(ox + half).toFixed(2)} ${oy.toFixed(2)} L ${(ox + sz).toFixed(2)} ${(oy + half).toFixed(2)} L ${(ox + half).toFixed(2)} ${(oy + sz).toFixed(2)} L ${ox.toFixed(2)} ${(oy + half).toFixed(2)} Z`;
    };

    const pOut = svgDiamond(originX, originY, outerSize);
    const pIn = svgDiamond(originX + innerOffset, originY + innerOffset, innerSize);

    if (isTransparent) {
      frameSvg = `<path d="${pOut} ${pIn}" fill="${color}" fill-rule="evenodd" />`;
    } else {
      frameSvg = `
        <path d="${pOut}" fill="${color}" />
        <path d="${pIn}" fill="${bgColor}" />
      `;
    }
  } else if (shape === "hexagon") {
    const svgHex = (ox: number, oy: number, sz: number) => {
      const inset = sz * 0.25;
      const hh = sz / 2;
      return `M ${(ox + inset).toFixed(2)} ${oy.toFixed(2)} L ${(ox + sz - inset).toFixed(2)} ${oy.toFixed(2)} L ${(ox + sz).toFixed(2)} ${(oy + hh).toFixed(2)} L ${(ox + sz - inset).toFixed(2)} ${(oy + sz).toFixed(2)} L ${(ox + inset).toFixed(2)} ${(oy + sz).toFixed(2)} L ${ox.toFixed(2)} ${(oy + hh).toFixed(2)} Z`;
    };

    const pOut = svgHex(originX, originY, outerSize);
    const pIn = svgHex(originX + innerOffset, originY + innerOffset, innerSize);

    if (isTransparent) {
      frameSvg = `<path d="${pOut} ${pIn}" fill="${color}" fill-rule="evenodd" />`;
    } else {
      frameSvg = `
        <path d="${pOut}" fill="${color}" />
        <path d="${pIn}" fill="${bgColor}" />
      `;
    }
  } else if (shape === "shield") {
    const svgShield = (ox: number, oy: number, sz: number) => {
      const r = sz * 0.2;
      return `M ${(ox + r).toFixed(2)} ${oy.toFixed(2)} L ${(ox + sz - r).toFixed(2)} ${oy.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${(ox + sz).toFixed(2)} ${(oy + r).toFixed(2)} L ${(ox + sz).toFixed(2)} ${(oy + sz * 0.55).toFixed(2)} Q ${(ox + sz).toFixed(2)} ${(oy + sz * 0.85).toFixed(2)} ${(ox + sz / 2).toFixed(2)} ${(oy + sz).toFixed(2)} Q ${ox.toFixed(2)} ${(oy + sz * 0.85).toFixed(2)} ${ox.toFixed(2)} ${(oy + sz * 0.55).toFixed(2)} L ${ox.toFixed(2)} ${(oy + r).toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${(ox + r).toFixed(2)} ${oy.toFixed(2)} Z`;
    };

    const pOut = svgShield(originX, originY, outerSize);
    const pIn = svgShield(originX + innerOffset, originY + innerOffset, innerSize);

    if (isTransparent) {
      frameSvg = `<path d="${pOut} ${pIn}" fill="${color}" fill-rule="evenodd" />`;
    } else {
      frameSvg = `
        <path d="${pOut}" fill="${color}" />
        <path d="${pIn}" fill="${bgColor}" />
      `;
    }
  } else if (shape === "star") {
    const svgStar = (centerX: number, centerY: number, outerR: number, innerR: number, points: number) => {
      let d = "";
      for (let i = 0; i < points * 2; i++) {
        const angle = (Math.PI * i) / points - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        const px = centerX + Math.cos(angle) * r;
        const py = centerY + Math.sin(angle) * r;
        d += (i === 0 ? "M " : "L ") + px.toFixed(2) + " " + py.toFixed(2) + " ";
      }
      return d + "Z";
    };

    const starPath = svgStar(cxNum, cyNum, outerSize / 2, outerSize * 0.22, 5);
    const rIn = (2.5 * modSize).toFixed(2);
    const rINum = 2.5 * modSize;

    if (isTransparent) {
      frameSvg = `<path d="${starPath} M ${cxNum} ${(cyNum - rINum).toFixed(2)} A ${rIn} ${rIn} 0 1 1 ${cxNum} ${(cyNum + rINum).toFixed(2)} A ${rIn} ${rIn} 0 1 1 ${cxNum} ${(cyNum - rINum).toFixed(2)} Z" fill="${color}" fill-rule="evenodd" />`;
    } else {
      frameSvg = `
        <path d="${starPath}" fill="${color}" />
        <circle cx="${cx}" cy="${cy}" r="${rIn}" fill="${bgColor}" />
      `;
    }
  } else if (shape === "viewfinder") {
    const arm = (2.2 * modSize).toFixed(2);
    const thick = modSize.toFixed(2);
    const ox = originX.toFixed(2);
    const oy = originY.toFixed(2);
    const rightArm = (originX + outerSize - 2.2 * modSize).toFixed(2);
    const rightThick = (originX + outerSize - modSize).toFixed(2);
    const bottomThick = (originY + outerSize - modSize).toFixed(2);
    const bottomArm = (originY + outerSize - 2.2 * modSize).toFixed(2);

    frameSvg = `
      <rect x="${ox}" y="${oy}" width="${arm}" height="${thick}" fill="${color}" />
      <rect x="${ox}" y="${oy}" width="${thick}" height="${arm}" fill="${color}" />
      <rect x="${rightArm}" y="${oy}" width="${arm}" height="${thick}" fill="${color}" />
      <rect x="${rightThick}" y="${oy}" width="${thick}" height="${arm}" fill="${color}" />
      <rect x="${ox}" y="${bottomThick}" width="${arm}" height="${thick}" fill="${color}" />
      <rect x="${ox}" y="${bottomArm}" width="${thick}" height="${arm}" fill="${color}" />
      <rect x="${rightArm}" y="${bottomThick}" width="${arm}" height="${thick}" fill="${color}" />
      <rect x="${rightThick}" y="${bottomArm}" width="${thick}" height="${arm}" fill="${color}" />
    `;
  } else if (shape === "heart") {
    const svgHeart = (hx: number, hy: number, s: number) => {
      return `M ${hx.toFixed(2)} ${(hy + s * 0.8).toFixed(2)} C ${(hx - s * 1.3).toFixed(2)} ${(hy + s * 0.15).toFixed(2)} ${(hx - s * 1.25).toFixed(2)} ${(hy - s * 0.8).toFixed(2)} ${hx.toFixed(2)} ${(hy - s * 0.25).toFixed(2)} C ${(hx + s * 1.25).toFixed(2)} ${(hy - s * 0.8).toFixed(2)} ${(hx + s * 1.3).toFixed(2)} ${(hy + s * 0.15).toFixed(2)} ${hx.toFixed(2)} ${(hy + s * 0.8).toFixed(2)} Z`;
    };

    const pOut = svgHeart(cxNum, cyNum, outerSize * 0.46);
    const pIn = svgHeart(cxNum, cyNum, innerSize * 0.44);

    if (isTransparent) {
      frameSvg = `<path d="${pOut} ${pIn}" fill="${color}" fill-rule="evenodd" />`;
    } else {
      frameSvg = `
        <path d="${pOut}" fill="${color}" />
        <path d="${pIn}" fill="${bgColor}" />
      `;
    }
  } else if (shape === "teardrop") {
    const rOut = 2.5 * modSize;
    const rIn = 1.7 * modSize;
    let tlO = rOut, trO = rOut, brO = rOut, blO = rOut;
    let tlI = rIn, trI = rIn, brI = rIn, blI = rIn;

    if (corner === "tl") {
      brO = 0; brI = 0;
    } else if (corner === "tr") {
      blO = 0; blI = 0;
    } else {
      trO = 0; trI = 0;
    }

    const pOut = getSvgRoundedRectPath(originX, originY, outerSize, outerSize, tlO, trO, brO, blO);
    const pIn = getSvgRoundedRectPath(originX + innerOffset, originY + innerOffset, innerSize, innerSize, tlI, trI, brI, blI);

    if (isTransparent) {
      frameSvg = `<path d="${pOut} ${pIn}" fill="${color}" fill-rule="evenodd" />`;
    } else {
      frameSvg = `
        <path d="${pOut}" fill="${color}" />
        <path d="${pIn}" fill="${bgColor}" />
      `;
    }
  } else if (shape === "clover") {
    const rLobe = (2.1 * modSize).toFixed(2);
    const dLobe = 1.35 * modSize;
    const rIn = (innerSize / 2).toFixed(2);

    frameSvg = `
      <circle cx="${cx}" cy="${(cyNum - dLobe).toFixed(2)}" r="${rLobe}" fill="${color}" />
      <circle cx="${(cxNum + dLobe).toFixed(2)}" cy="${cy}" r="${rLobe}" fill="${color}" />
      <circle cx="${cx}" cy="${(cyNum + dLobe).toFixed(2)}" r="${rLobe}" fill="${color}" />
      <circle cx="${(cxNum - dLobe).toFixed(2)}" cy="${cy}" r="${rLobe}" fill="${color}" />
      <circle cx="${cx}" cy="${cy}" r="${rIn}" fill="${isTransparent ? 'none' : bgColor}" />
    `;
  } else if (shape === "gear") {
    const points = 16;
    let pts = "";
    for (let i = 0; i < points; i++) {
      const angle = (Math.PI * 2 * i) / points;
      const r = i % 2 === 0 ? outerSize * 0.5 : outerSize * 0.42;
      const px = cxNum + Math.cos(angle) * r;
      const py = cyNum + Math.sin(angle) * r;
      pts += `${px.toFixed(2)},${py.toFixed(2)} `;
    }
    const rIn = (innerSize / 2).toFixed(2);

    frameSvg = `
      <polygon points="${pts.trim()}" fill="${color}" />
      <circle cx="${cx}" cy="${cy}" r="${rIn}" fill="${isTransparent ? 'none' : bgColor}" />
    `;
  } else if (shape === "concentric") {
    const r1Out = (outerSize / 2).toFixed(2);
    const r1In = (2.7 * modSize).toFixed(2);
    const r2Out = (2.3 * modSize).toFixed(2);
    const r2In = (1.8 * modSize).toFixed(2);

    frameSvg = `
      <path d="M ${cxNum} ${(cyNum - outerSize / 2).toFixed(2)} A ${r1Out} ${r1Out} 0 1 0 ${cxNum} ${(cyNum + outerSize / 2).toFixed(2)} A ${r1Out} ${r1Out} 0 1 0 ${cxNum} ${(cyNum - outerSize / 2).toFixed(2)} Z M ${cxNum} ${(cyNum - 2.7 * modSize).toFixed(2)} A ${r1In} ${r1In} 0 1 1 ${cxNum} ${(cyNum + 2.7 * modSize).toFixed(2)} A ${r1In} ${r1In} 0 1 1 ${cxNum} ${(cyNum - 2.7 * modSize).toFixed(2)} Z" fill="${color}" fill-rule="evenodd" />
      <path d="M ${cxNum} ${(cyNum - 2.3 * modSize).toFixed(2)} A ${r2Out} ${r2Out} 0 1 0 ${cxNum} ${(cyNum + 2.3 * modSize).toFixed(2)} A ${r2Out} ${r2Out} 0 1 0 ${cxNum} ${(cyNum - 2.3 * modSize).toFixed(2)} Z M ${cxNum} ${(cyNum - 1.8 * modSize).toFixed(2)} A ${r2In} ${r2In} 0 1 1 ${cxNum} ${(cyNum + 1.8 * modSize).toFixed(2)} A ${r2In} ${r2In} 0 1 1 ${cxNum} ${(cyNum - 1.8 * modSize).toFixed(2)} Z" fill="${color}" fill-rule="evenodd" />
    `;
  } else {
    // Square
    if (isTransparent) {
      frameSvg = `<path d="M ${originX.toFixed(2)} ${originY.toFixed(2)} h ${outerSize.toFixed(2)} v ${outerSize.toFixed(2)} h -${outerSize.toFixed(2)} Z M ${(originX + innerOffset).toFixed(2)} ${(originY + innerOffset).toFixed(2)} v ${innerSize.toFixed(2)} h ${innerSize.toFixed(2)} v -${innerSize.toFixed(2)} Z" fill="${color}" fill-rule="evenodd" />`;
    } else {
      frameSvg = `
        <rect x="${originX.toFixed(2)}" y="${originY.toFixed(2)}" width="${outerSize.toFixed(2)}" height="${outerSize.toFixed(2)}" fill="${color}" />
        <rect x="${(originX + innerOffset).toFixed(2)}" y="${(originY + innerOffset).toFixed(2)}" width="${innerSize.toFixed(2)}" height="${innerSize.toFixed(2)}" fill="${bgColor}" />
      `;
    }
  }

  return `
    ${frameSvg}
    ${pupilSvg}
  `;
}

// Draw container outline or card styling onto Canvas
export function drawCodeContainerOnCanvas(
  ctx: CanvasRenderingContext2D,
  targetSize: number,
  container: CodeContainer,
  bgColor: string,
  borderColor: string
) {
  if (container === "default") return;
  const isTransparent = bgColor.toLowerCase() === "transparent";

  if (container === "rounded") {
    const pad = targetSize * 0.015;
    const r = targetSize * 0.08;
    ctx.save();
    if (!isTransparent) {
      ctx.fillStyle = bgColor;
      drawRoundRectPath(ctx, pad, pad, targetSize - pad * 2, targetSize - pad * 2, r, r, r, r);
      ctx.fill();
    }
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = targetSize * 0.01;
    drawRoundRectPath(ctx, pad, pad, targetSize - pad * 2, targetSize - pad * 2, r, r, r, r);
    ctx.stroke();
    ctx.restore();
  } else if (container === "circle") {
    const cx = targetSize / 2;
    const cy = targetSize / 2;
    const r = targetSize * 0.485;
    ctx.save();
    if (!isTransparent) {
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = targetSize * 0.01;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if (container === "stamp") {
    const scallops = 24;
    const step = targetSize / scallops;
    const r = step * 0.28;
    ctx.save();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = targetSize * 0.008;
    ctx.strokeRect(targetSize * 0.02, targetSize * 0.02, targetSize * 0.96, targetSize * 0.96);

    ctx.fillStyle = isTransparent ? "#FFFFFF" : bgColor;
    for (let i = 0; i <= scallops; i++) {
      const p = i * step;
      ctx.beginPath();
      ctx.arc(p, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p, targetSize, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, p, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(targetSize, p, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// Generate SVG string for the code container
export function getCodeContainerSvg(
  targetSize: number,
  container: CodeContainer,
  bgColor: string,
  borderColor: string
): string {
  if (container === "default") return "";
  const isTransparent = bgColor.toLowerCase() === "transparent";

  if (container === "rounded") {
    const pad = (targetSize * 0.015).toFixed(2);
    const size = (targetSize - targetSize * 0.03).toFixed(2);
    const r = (targetSize * 0.08).toFixed(2);
    const strokeW = (targetSize * 0.01).toFixed(2);
    return `<rect x="${pad}" y="${pad}" width="${size}" height="${size}" rx="${r}" fill="${isTransparent ? 'none' : bgColor}" stroke="${borderColor}" stroke-width="${strokeW}" />`;
  } else if (container === "circle") {
    const cx = (targetSize / 2).toFixed(2);
    const cy = (targetSize / 2).toFixed(2);
    const r = (targetSize * 0.485).toFixed(2);
    const strokeW = (targetSize * 0.01).toFixed(2);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${isTransparent ? 'none' : bgColor}" stroke="${borderColor}" stroke-width="${strokeW}" />`;
  } else if (container === "stamp") {
    const scallops = 24;
    const step = targetSize / scallops;
    const r = (step * 0.28).toFixed(2);
    const strokeW = (targetSize * 0.008).toFixed(2);
    let holes = "";
    for (let i = 0; i <= scallops; i++) {
      const p = (i * step).toFixed(2);
      holes += `<circle cx="${p}" cy="0" r="${r}" fill="${isTransparent ? '#FFFFFF' : bgColor}" />`;
      holes += `<circle cx="${p}" cy="${targetSize}" r="${r}" fill="${isTransparent ? '#FFFFFF' : bgColor}" />`;
      holes += `<circle cx="0" cy="${p}" r="${r}" fill="${isTransparent ? '#FFFFFF' : bgColor}" />`;
      holes += `<circle cx="${targetSize}" cy="${p}" r="${r}" fill="${isTransparent ? '#FFFFFF' : bgColor}" />`;
    }
    return `
      <rect x="${(targetSize * 0.02).toFixed(2)}" y="${(targetSize * 0.02).toFixed(2)}" width="${(targetSize * 0.96).toFixed(2)}" height="${(targetSize * 0.96).toFixed(2)}" fill="none" stroke="${borderColor}" stroke-width="${strokeW}" />
      ${holes}
    `;
  }
  return "";
}

export interface RenderCanvasOptions {
  targetCanvas: HTMLCanvasElement;
  targetSize?: number;
  qrData: QRCodeData;
  palette: string[];
  bgColor: string;
  bestContrastColor: string;
  seed: string;
  finderShape: FinderShape;
  eyePupilShape?: EyePupilShape;
  moduleShape: ModuleShape;
  colorMode: ColorMode;
  codeContainer?: CodeContainer;
  logoSrc: string | null;
  logoImage: HTMLImageElement | null;
  logoSizePercent: number;
  logoBacking: LogoBacking;
  logoBackingColor: string;
}

export function renderQRToCanvas({
  targetCanvas,
  targetSize = 1024,
  qrData,
  palette,
  bgColor,
  bestContrastColor,
  seed,
  finderShape,
  eyePupilShape = "auto",
  moduleShape,
  colorMode,
  codeContainer = "default",
  logoSrc,
  logoImage,
  logoSizePercent,
  logoBacking,
  logoBackingColor,
}: RenderCanvasOptions) {
  const ctx = targetCanvas.getContext("2d");
  if (!ctx) return;

  const { size: moduleCount, modules } = qrData;
  targetCanvas.width = targetSize;
  targetCanvas.height = targetSize;

  const quietZone = 4;
  const totalModules = moduleCount + quietZone * 2;
  const modulePixelSize = targetSize / totalModules;

  // Fill background if not transparent
  if (bgColor.toLowerCase() !== "transparent") {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, targetSize, targetSize);
  }

  // Draw Code Container if set
  if (codeContainer !== "default") {
    drawCodeContainerOnCanvas(ctx, targetSize, codeContainer, bgColor, bestContrastColor);
  }

  const rng = createRng(seed);

  let logoLeftMod = -1;
  let logoRightMod = -1;
  let logoTopMod = -1;
  let logoBottomMod = -1;

  if (logoSrc) {
    const logoModules = (logoSizePercent / 100) * moduleCount;
    const center = moduleCount / 2;
    const half = logoModules / 2;
    logoLeftMod = Math.floor(center - half);
    logoRightMod = Math.ceil(center + half) - 1;
    logoTopMod = Math.floor(center - half);
    logoBottomMod = Math.ceil(center + half) - 1;
  }

  let fillGradient: CanvasGradient | null = null;
  const seedNum = Math.abs(parseInt(seed, 10) || 48291);

  if (colorMode === "gradient") {
    const angleMode = seedNum % 4;
    if (angleMode === 0) {
      fillGradient = ctx.createLinearGradient(0, 0, targetSize, targetSize);
    } else if (angleMode === 1) {
      fillGradient = ctx.createLinearGradient(targetSize / 2, 0, targetSize / 2, targetSize);
    } else if (angleMode === 2) {
      fillGradient = ctx.createLinearGradient(0, targetSize, targetSize, 0);
    } else {
      fillGradient = ctx.createLinearGradient(0, targetSize / 2, targetSize, targetSize / 2);
    }

    if (palette.length === 1) {
      fillGradient.addColorStop(0, palette[0]);
      fillGradient.addColorStop(1, palette[0]);
    } else {
      palette.forEach((c, idx) => {
        fillGradient!.addColorStop(idx / (palette.length - 1), c);
      });
    }
  } else if (colorMode === "radial") {
    const offsetMode = seedNum % 3;
    const cx = offsetMode === 1 ? targetSize * 0.42 : offsetMode === 2 ? targetSize * 0.58 : targetSize * 0.5;
    const cy = offsetMode === 1 ? targetSize * 0.42 : offsetMode === 2 ? targetSize * 0.58 : targetSize * 0.5;

    fillGradient = ctx.createRadialGradient(
      cx,
      cy,
      targetSize * 0.05,
      targetSize / 2,
      targetSize / 2,
      targetSize * 0.72
    );

    if (palette.length === 1) {
      fillGradient.addColorStop(0, palette[0]);
      fillGradient.addColorStop(1, palette[0]);
    } else {
      palette.forEach((c, idx) => {
        fillGradient!.addColorStop(idx / (palette.length - 1), c);
      });
    }
  }

  const isDataCell = (r: number, c: number) => {
    if (r < 0 || r >= moduleCount || c < 0 || c >= moduleCount) return false;
    if (r < 8 && c < 8) return false;
    if (r < 8 && c >= moduleCount - 8) return false;
    if (r >= moduleCount - 8 && c < 8) return false;
    if (logoSrc && r >= logoTopMod && r <= logoBottomMod && c >= logoLeftMod && c <= logoRightMod) return false;
    return modules[r][c];
  };

  // Draw all data modules
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (!modules[r][c]) continue;

      if ((r < 8 && c < 8) || (r < 8 && c >= moduleCount - 8) || (r >= moduleCount - 8 && c < 8)) {
        continue;
      }

      if (logoSrc && r >= logoTopMod && r <= logoBottomMod && c >= logoLeftMod && c <= logoRightMod) {
        continue;
      }

      const x = (c + quietZone) * modulePixelSize;
      const y = (r + quietZone) * modulePixelSize;
      const cx = x + modulePixelSize / 2;
      const cy = y + modulePixelSize / 2;

      if (fillGradient) {
        ctx.fillStyle = fillGradient;
      } else {
        const colorIdx = Math.floor(rng() * palette.length);
        ctx.fillStyle = palette[colorIdx];
      }

      if (moduleShape === "square") {
        ctx.fillRect(x, y, modulePixelSize + 0.3, modulePixelSize + 0.3);
      } else if (moduleShape === "rounded") {
        const rad = modulePixelSize * 0.35;
        drawRoundRectPath(ctx, x, y, modulePixelSize, modulePixelSize, rad, rad, rad, rad);
        ctx.fill();
      } else if (moduleShape === "dots") {
        ctx.beginPath();
        ctx.arc(cx, cy, modulePixelSize * 0.44, 0, Math.PI * 2);
        ctx.fill();
      } else if (moduleShape === "diamond") {
        ctx.beginPath();
        ctx.moveTo(cx, y);
        ctx.lineTo(x + modulePixelSize, cy);
        ctx.lineTo(cx, y + modulePixelSize);
        ctx.lineTo(x, cy);
        ctx.closePath();
        ctx.fill();
      } else if (moduleShape === "fluid") {
        const hasTop = isDataCell(r - 1, c);
        const hasBottom = isDataCell(r + 1, c);
        const hasLeft = isDataCell(r, c - 1);
        const hasRight = isDataCell(r, c + 1);

        const rad = modulePixelSize * 0.32;
        const tl = !hasTop && !hasLeft ? rad : 0;
        const tr = !hasTop && !hasRight ? rad : 0;
        const br = !hasBottom && !hasRight ? rad : 0;
        const bl = !hasBottom && !hasLeft ? rad : 0;

        drawRoundRectPath(ctx, x, y, modulePixelSize + 0.1, modulePixelSize + 0.1, tl, tr, br, bl);
        ctx.fill();
      } else if (moduleShape === "liquid") {
        const hasTop = isDataCell(r - 1, c);
        const hasBottom = isDataCell(r + 1, c);
        const hasLeft = isDataCell(r, c - 1);
        const hasRight = isDataCell(r, c + 1);

        const rad = modulePixelSize * 0.5;
        const tl = !hasTop && !hasLeft ? rad : 0;
        const tr = !hasTop && !hasRight ? rad : 0;
        const br = !hasBottom && !hasRight ? rad : 0;
        const bl = !hasBottom && !hasLeft ? rad : 0;

        drawRoundRectPath(ctx, x, y, modulePixelSize + 0.15, modulePixelSize + 0.15, tl, tr, br, bl);
        ctx.fill();
      } else if (moduleShape === "classy") {
        const rad = modulePixelSize * 0.5;
        drawRoundRectPath(ctx, x, y, modulePixelSize + 0.1, modulePixelSize + 0.1, 0, 0, rad, 0);
        ctx.fill();
      } else if (moduleShape === "classyRounded") {
        const smallR = modulePixelSize * 0.15;
        const bigR = modulePixelSize * 0.5;
        drawRoundRectPath(ctx, x, y, modulePixelSize + 0.1, modulePixelSize + 0.1, smallR, smallR, bigR, smallR);
        ctx.fill();
      } else if (moduleShape === "star") {
        const outerR = modulePixelSize * 0.5;
        const innerR = modulePixelSize * 0.2;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * i) / 4 - Math.PI / 2;
          const r = i % 2 === 0 ? outerR : innerR;
          const px = cx + Math.cos(angle) * r;
          const py = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      } else if (moduleShape === "hexagon") {
        const hr = modulePixelSize * 0.48;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const px = cx + Math.cos(angle) * hr;
          const py = cy + Math.sin(angle) * hr;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      } else if (moduleShape === "cross") {
        const arm = modulePixelSize * 0.3;
        const full = modulePixelSize;
        ctx.fillRect(x + arm, y, full - arm * 2, full);
        ctx.fillRect(x, y + arm, full, full - arm * 2);
      } else if (moduleShape === "triangle") {
        const pointsUp = (r + c) % 2 === 0;
        ctx.beginPath();
        if (pointsUp) {
          ctx.moveTo(cx, y);
          ctx.lineTo(x + modulePixelSize, y + modulePixelSize);
          ctx.lineTo(x, y + modulePixelSize);
        } else {
          ctx.moveTo(x, y);
          ctx.lineTo(x + modulePixelSize, y);
          ctx.lineTo(cx, y + modulePixelSize);
        }
        ctx.closePath();
        ctx.fill();
      } else if (moduleShape === "heart") {
        const s = modulePixelSize * 0.44;
        ctx.beginPath();
        ctx.moveTo(cx, cy + s * 0.8);
        ctx.bezierCurveTo(cx - s * 1.3, cy + s * 0.15, cx - s * 1.25, cy - s * 0.8, cx, cy - s * 0.25);
        ctx.bezierCurveTo(cx + s * 1.25, cy - s * 0.8, cx + s * 1.3, cy + s * 0.15, cx, cy + s * 0.8);
        ctx.closePath();
        ctx.fill();
      } else if (moduleShape === "flower") {
        const rBase = modulePixelSize * 0.46;
        ctx.beginPath();
        for (let i = 0; i <= 32; i++) {
          const theta = (Math.PI * 2 * i) / 32;
          const rad = rBase * (0.7 + 0.3 * Math.cos(4 * theta));
          const px = cx + Math.cos(theta) * rad;
          const py = cy + Math.sin(theta) * rad;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      } else if (moduleShape === "circuit") {
        const hasTop = isDataCell(r - 1, c);
        const hasBottom = isDataCell(r + 1, c);
        const hasLeft = isDataCell(r, c - 1);
        const hasRight = isDataCell(r, c + 1);

        const padR = modulePixelSize * 0.26;
        const traceW = modulePixelSize * 0.26;
        const halfTrace = traceW / 2;

        // Center pad
        ctx.beginPath();
        ctx.arc(cx, cy, padR, 0, Math.PI * 2);
        ctx.fill();

        // Neighbor traces
        if (hasTop) ctx.fillRect(cx - halfTrace, y, traceW, modulePixelSize / 2);
        if (hasBottom) ctx.fillRect(cx - halfTrace, cy, traceW, modulePixelSize / 2);
        if (hasLeft) ctx.fillRect(x, cy - halfTrace, modulePixelSize / 2, traceW);
        if (hasRight) ctx.fillRect(cx, cy - halfTrace, modulePixelSize / 2, traceW);

        // If isolated, draw a distinct node
        if (!hasTop && !hasBottom && !hasLeft && !hasRight) {
          ctx.beginPath();
          ctx.arc(cx, cy, modulePixelSize * 0.38, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (moduleShape === "donut") {
        const rOut = modulePixelSize * 0.44;
        const rIn = modulePixelSize * 0.22;
        ctx.beginPath();
        ctx.arc(cx, cy, rOut, 0, Math.PI * 2);
        ctx.arc(cx, cy, rIn, 0, Math.PI * 2, true);
        ctx.fill();
      } else if (moduleShape === "rhombus") {
        const slant = modulePixelSize * 0.22;
        ctx.beginPath();
        ctx.moveTo(x + slant, y);
        ctx.lineTo(x + modulePixelSize, y);
        ctx.lineTo(x + modulePixelSize - slant, y + modulePixelSize);
        ctx.lineTo(x, y + modulePixelSize);
        ctx.closePath();
        ctx.fill();
      } else if (moduleShape === "mosaic") {
        const gap = modulePixelSize * 0.1;
        const sub = (modulePixelSize - gap) / 2;
        const rad = sub * 0.3;
        const mode = (r + c) % 3;

        if (mode === 0) {
          // 4 distinct micro-tiles
          drawRoundRectPath(ctx, x, y, sub, sub, rad, rad, rad, rad);
          ctx.fill();
          drawRoundRectPath(ctx, x + sub + gap, y, sub, sub, rad, rad, rad, rad);
          ctx.fill();
          drawRoundRectPath(ctx, x, y + sub + gap, sub, sub, rad, rad, rad, rad);
          ctx.fill();
          drawRoundRectPath(ctx, x + sub + gap, y + sub + gap, sub, sub, rad, rad, rad, rad);
          ctx.fill();
        } else if (mode === 1) {
          // Diagonal micro-tiles + center diamond
          drawRoundRectPath(ctx, x, y, sub, sub, rad, rad, rad, rad);
          ctx.fill();
          drawRoundRectPath(ctx, x + sub + gap, y + sub + gap, sub, sub, rad, rad, rad, rad);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(cx, cy - sub * 0.5);
          ctx.lineTo(cx + sub * 0.5, cy);
          ctx.lineTo(cx, cy + sub * 0.5);
          ctx.lineTo(cx - sub * 0.5, cy);
          ctx.closePath();
          ctx.fill();
        } else {
          // Asymmetric quadrant
          drawRoundRectPath(ctx, x, y, sub * 1.5, sub * 1.5, rad, rad, rad, rad);
          ctx.fill();
          drawRoundRectPath(ctx, x + sub + gap, y + sub + gap, sub, sub, rad, rad, rad, rad);
          ctx.fill();
        }
      }
    }
  }

  // Draw 3 finder eyes with custom frame and pupil
  drawFinderEye(
    ctx,
    quietZone * modulePixelSize,
    quietZone * modulePixelSize,
    modulePixelSize,
    finderShape,
    bestContrastColor,
    bgColor,
    "tl",
    eyePupilShape
  );
  drawFinderEye(
    ctx,
    (moduleCount - 7 + quietZone) * modulePixelSize,
    quietZone * modulePixelSize,
    modulePixelSize,
    finderShape,
    bestContrastColor,
    bgColor,
    "tr",
    eyePupilShape
  );
  drawFinderEye(
    ctx,
    quietZone * modulePixelSize,
    (moduleCount - 7 + quietZone) * modulePixelSize,
    modulePixelSize,
    finderShape,
    bestContrastColor,
    bgColor,
    "bl",
    eyePupilShape
  );

  // Draw Logo if present
  if (logoImage && logoSrc) {
    const logoPixelSize = (logoSizePercent / 100) * (moduleCount * modulePixelSize);
    const cx = targetSize / 2;
    const cy = targetSize / 2;
    const lx = cx - logoPixelSize / 2;
    const ly = cy - logoPixelSize / 2;

    if (logoBacking !== "none") {
      const pad = modulePixelSize * 0.25;
      ctx.fillStyle = logoBackingColor;
      if (logoBacking === "circle") {
        ctx.beginPath();
        ctx.arc(cx, cy, (logoPixelSize + pad) / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (logoBacking === "rounded") {
        ctx.beginPath();
        drawRoundRectPath(
          ctx,
          lx - pad / 2,
          ly - pad / 2,
          logoPixelSize + pad,
          logoPixelSize + pad,
          (logoPixelSize + pad) * 0.22,
          (logoPixelSize + pad) * 0.22,
          (logoPixelSize + pad) * 0.22,
          (logoPixelSize + pad) * 0.22
        );
        ctx.fill();
      } else {
        ctx.fillRect(lx - pad / 2, ly - pad / 2, logoPixelSize + pad, logoPixelSize + pad);
      }
    }

    ctx.drawImage(logoImage, lx, ly, logoPixelSize, logoPixelSize);
  }
}

export interface GenerateSvgOptions {
  qrData: QRCodeData;
  palette: string[];
  bgColor: string;
  bestContrastColor: string;
  seed: string;
  finderShape: FinderShape;
  eyePupilShape?: EyePupilShape;
  moduleShape: ModuleShape;
  colorMode: ColorMode;
  codeContainer?: CodeContainer;
  logoSrc: string | null;
  logoSizePercent: number;
  logoBacking: LogoBacking;
  logoBackingColor: string;
}

export function generateQRSvgString({
  qrData,
  palette,
  bgColor,
  bestContrastColor,
  seed,
  finderShape,
  eyePupilShape = "auto",
  moduleShape,
  colorMode,
  codeContainer = "default",
  logoSrc,
  logoSizePercent,
  logoBacking,
  logoBackingColor,
}: GenerateSvgOptions): string {
  const { size: moduleCount, modules } = qrData;
  const quietZone = 4;
  const totalModules = moduleCount + quietZone * 2;
  const svgSize = 1024;
  const modSize = svgSize / totalModules;

  const rng = createRng(seed);
  const seedNum = Math.abs(parseInt(seed, 10) || 48291);

  let logoLeftMod = -1;
  let logoRightMod = -1;
  let logoTopMod = -1;
  let logoBottomMod = -1;

  if (logoSrc) {
    const logoModules = (logoSizePercent / 100) * moduleCount;
    const center = moduleCount / 2;
    const half = logoModules / 2;
    logoLeftMod = Math.floor(center - half);
    logoRightMod = Math.ceil(center + half) - 1;
    logoTopMod = Math.floor(center - half);
    logoBottomMod = Math.ceil(center + half) - 1;
  }

  // Gradient defs if requested
  let defsXml = "";
  if (colorMode === "gradient") {
    const angleMode = seedNum % 4;
    let coords = 'x1="0%" y1="0%" x2="100%" y2="100%"';
    if (angleMode === 1) coords = 'x1="50%" y1="0%" x2="50%" y2="100%"';
    else if (angleMode === 2) coords = 'x1="0%" y1="100%" x2="100%" y2="0%"';
    else if (angleMode === 3) coords = 'x1="0%" y1="50%" x2="100%" y2="50%"';

    const stops =
      palette.length === 1
        ? `<stop offset="0%" stop-color="${palette[0]}" /><stop offset="100%" stop-color="${palette[0]}" />`
        : palette
            .map(
              (c, idx) =>
                `<stop offset="${((idx / (palette.length - 1)) * 100).toFixed(1)}%" stop-color="${c}" />`
            )
            .join("");
    defsXml = `<defs><linearGradient id="qrGrad" ${coords}>${stops}</linearGradient></defs>`;
  } else if (colorMode === "radial") {
    const offsetMode = seedNum % 3;
    const cx = offsetMode === 1 ? "42%" : offsetMode === 2 ? "58%" : "50%";
    const cy = offsetMode === 1 ? "42%" : offsetMode === 2 ? "58%" : "50%";

    const stops =
      palette.length === 1
        ? `<stop offset="0%" stop-color="${palette[0]}" /><stop offset="100%" stop-color="${palette[0]}" />`
        : palette
            .map(
              (c, idx) =>
                `<stop offset="${((idx / (palette.length - 1)) * 100).toFixed(1)}%" stop-color="${c}" />`
            )
            .join("");
    defsXml = `<defs><radialGradient id="qrGrad" cx="${cx}" cy="${cy}" r="70%">${stops}</radialGradient></defs>`;
  }

  const isDataCell = (r: number, c: number) => {
    if (r < 0 || r >= moduleCount || c < 0 || c >= moduleCount) return false;
    if (r < 8 && c < 8) return false;
    if (r < 8 && c >= moduleCount - 8) return false;
    if (r >= moduleCount - 8 && c < 8) return false;
    if (logoSrc && r >= logoTopMod && r <= logoBottomMod && c >= logoLeftMod && c <= logoRightMod) return false;
    return modules[r][c];
  };

  let modulesXml = "";
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (!modules[r][c]) continue;
      if ((r < 8 && c < 8) || (r < 8 && c >= moduleCount - 8) || (r >= moduleCount - 8 && c < 8)) continue;
      if (logoSrc && r >= logoTopMod && r <= logoBottomMod && c >= logoLeftMod && c <= logoRightMod) continue;

      const x = ((c + quietZone) * modSize).toFixed(2);
      const y = ((r + quietZone) * modSize).toFixed(2);
      const cx = ((c + quietZone + 0.5) * modSize).toFixed(2);
      const cy = ((r + quietZone + 0.5) * modSize).toFixed(2);
      const w = (modSize + 0.1).toFixed(2);

      let fillAttr = "";
      if (colorMode === "scatter") {
        const colorIdx = Math.floor(rng() * palette.length);
        fillAttr = `fill="${palette[colorIdx]}"`;
      } else {
        fillAttr = `fill="url(#qrGrad)"`;
      }

      if (moduleShape === "square") {
        modulesXml += `<rect x="${x}" y="${y}" width="${w}" height="${w}" ${fillAttr} />`;
      } else if (moduleShape === "rounded") {
        const rx = (modSize * 0.35).toFixed(2);
        modulesXml += `<rect x="${x}" y="${y}" width="${w}" height="${w}" rx="${rx}" ${fillAttr} />`;
      } else if (moduleShape === "dots") {
        const rad = (modSize * 0.44).toFixed(2);
        modulesXml += `<circle cx="${cx}" cy="${cy}" r="${rad}" ${fillAttr} />`;
      } else if (moduleShape === "diamond") {
        const mx = (parseFloat(x) + modSize / 2).toFixed(2);
        const my = (parseFloat(y) + modSize / 2).toFixed(2);
        const x2 = (parseFloat(x) + modSize).toFixed(2);
        const y2 = (parseFloat(y) + modSize).toFixed(2);
        modulesXml += `<polygon points="${mx},${y} ${x2},${my} ${mx},${y2} ${x},${my}" ${fillAttr} />`;
      } else if (moduleShape === "fluid") {
        const hasTop = isDataCell(r - 1, c);
        const hasBottom = isDataCell(r + 1, c);
        const hasLeft = isDataCell(r, c - 1);
        const hasRight = isDataCell(r, c + 1);

        const rad = modSize * 0.32;
        const tl = !hasTop && !hasLeft ? rad : 0;
        const tr = !hasTop && !hasRight ? rad : 0;
        const br = !hasBottom && !hasRight ? rad : 0;
        const bl = !hasBottom && !hasLeft ? rad : 0;

        const p = getSvgRoundedRectPath(
          (c + quietZone) * modSize,
          (r + quietZone) * modSize,
          modSize + 0.05,
          modSize + 0.05,
          tl, tr, br, bl
        );
        modulesXml += `<path d="${p}" ${fillAttr} />`;
      } else if (moduleShape === "liquid") {
        const hasTop = isDataCell(r - 1, c);
        const hasBottom = isDataCell(r + 1, c);
        const hasLeft = isDataCell(r, c - 1);
        const hasRight = isDataCell(r, c + 1);

        const rad = modSize * 0.5;
        const tl = !hasTop && !hasLeft ? rad : 0;
        const tr = !hasTop && !hasRight ? rad : 0;
        const br = !hasBottom && !hasRight ? rad : 0;
        const bl = !hasBottom && !hasLeft ? rad : 0;

        const p = getSvgRoundedRectPath(
          (c + quietZone) * modSize,
          (r + quietZone) * modSize,
          modSize + 0.06,
          modSize + 0.06,
          tl, tr, br, bl
        );
        modulesXml += `<path d="${p}" ${fillAttr} />`;
      } else if (moduleShape === "classy") {
        const rad = modSize * 0.5;
        const p = getSvgRoundedRectPath(
          (c + quietZone) * modSize,
          (r + quietZone) * modSize,
          modSize + 0.05,
          modSize + 0.05,
          0, 0, rad, 0
        );
        modulesXml += `<path d="${p}" ${fillAttr} />`;
      } else if (moduleShape === "classyRounded") {
        const smallR = modSize * 0.15;
        const bigR = modSize * 0.5;
        const p = getSvgRoundedRectPath(
          (c + quietZone) * modSize,
          (r + quietZone) * modSize,
          modSize + 0.05,
          modSize + 0.05,
          smallR, smallR, bigR, smallR
        );
        modulesXml += `<path d="${p}" ${fillAttr} />`;
      } else if (moduleShape === "star") {
        const scx = (c + quietZone + 0.5) * modSize;
        const scy = (r + quietZone + 0.5) * modSize;
        const outerR = modSize * 0.5;
        const innerR = modSize * 0.2;
        let d = "";
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * i) / 4 - Math.PI / 2;
          const sr = i % 2 === 0 ? outerR : innerR;
          const px = scx + Math.cos(angle) * sr;
          const py = scy + Math.sin(angle) * sr;
          d += (i === 0 ? "M " : "L ") + px.toFixed(2) + " " + py.toFixed(2) + " ";
        }
        d += "Z";
        modulesXml += `<path d="${d}" ${fillAttr} />`;
      } else if (moduleShape === "hexagon") {
        const hcx = (c + quietZone + 0.5) * modSize;
        const hcy = (r + quietZone + 0.5) * modSize;
        const hr = modSize * 0.48;
        let d = "";
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const px = hcx + Math.cos(angle) * hr;
          const py = hcy + Math.sin(angle) * hr;
          d += (i === 0 ? "M " : "L ") + px.toFixed(2) + " " + py.toFixed(2) + " ";
        }
        d += "Z";
        modulesXml += `<path d="${d}" ${fillAttr} />`;
      } else if (moduleShape === "cross") {
        const xn = (c + quietZone) * modSize;
        const yn = (r + quietZone) * modSize;
        const arm = modSize * 0.3;
        const full = modSize;
        modulesXml += `<rect x="${(xn + arm).toFixed(2)}" y="${yn.toFixed(2)}" width="${(full - arm * 2).toFixed(2)}" height="${full.toFixed(2)}" ${fillAttr} />`;
        modulesXml += `<rect x="${xn.toFixed(2)}" y="${(yn + arm).toFixed(2)}" width="${full.toFixed(2)}" height="${(full - arm * 2).toFixed(2)}" ${fillAttr} />`;
      } else if (moduleShape === "triangle") {
        const xn = (c + quietZone) * modSize;
        const yn = (r + quietZone) * modSize;
        const pointsUp = (r + c) % 2 === 0;
        let points: string;
        if (pointsUp) {
          points = `${(xn + modSize / 2).toFixed(2)},${yn.toFixed(2)} ${(xn + modSize).toFixed(2)},${(yn + modSize).toFixed(2)} ${xn.toFixed(2)},${(yn + modSize).toFixed(2)}`;
        } else {
          points = `${xn.toFixed(2)},${yn.toFixed(2)} ${(xn + modSize).toFixed(2)},${yn.toFixed(2)} ${(xn + modSize / 2).toFixed(2)},${(yn + modSize).toFixed(2)}`;
        }
        modulesXml += `<polygon points="${points}" ${fillAttr} />`;
      } else if (moduleShape === "heart") {
        const cxn = (c + quietZone + 0.5) * modSize;
        const cyn = (r + quietZone + 0.5) * modSize;
        const s = modSize * 0.44;
        const d = `M ${cxn.toFixed(2)} ${(cyn + s * 0.8).toFixed(2)} C ${(cxn - s * 1.3).toFixed(2)} ${(cyn + s * 0.15).toFixed(2)} ${(cxn - s * 1.25).toFixed(2)} ${(cyn - s * 0.8).toFixed(2)} ${cxn.toFixed(2)} ${(cyn - s * 0.25).toFixed(2)} C ${(cxn + s * 1.25).toFixed(2)} ${(cyn - s * 0.8).toFixed(2)} ${(cxn + s * 1.3).toFixed(2)} ${(cyn + s * 0.15).toFixed(2)} ${cxn.toFixed(2)} ${(cyn + s * 0.8).toFixed(2)} Z`;
        modulesXml += `<path d="${d}" ${fillAttr} />`;
      } else if (moduleShape === "flower") {
        const cxn = (c + quietZone + 0.5) * modSize;
        const cyn = (r + quietZone + 0.5) * modSize;
        const rBase = modSize * 0.46;
        let d = "";
        for (let i = 0; i <= 32; i++) {
          const theta = (Math.PI * 2 * i) / 32;
          const rad = rBase * (0.7 + 0.3 * Math.cos(4 * theta));
          const px = cxn + Math.cos(theta) * rad;
          const py = cyn + Math.sin(theta) * rad;
          d += (i === 0 ? "M " : "L ") + px.toFixed(2) + " " + py.toFixed(2) + " ";
        }
        d += "Z";
        modulesXml += `<path d="${d}" ${fillAttr} />`;
      } else if (moduleShape === "circuit") {
        const cxn = (c + quietZone + 0.5) * modSize;
        const cyn = (r + quietZone + 0.5) * modSize;
        const xn = (c + quietZone) * modSize;
        const yn = (r + quietZone) * modSize;
        const padR = (modSize * 0.26).toFixed(2);
        const traceW = (modSize * 0.26).toFixed(2);
        const halfTrace = modSize * 0.13;
        const halfCell = (modSize / 2).toFixed(2);

        const hasTop = isDataCell(r - 1, c);
        const hasBottom = isDataCell(r + 1, c);
        const hasLeft = isDataCell(r, c - 1);
        const hasRight = isDataCell(r, c + 1);

        let circuitGroup = `<circle cx="${cxn.toFixed(2)}" cy="${cyn.toFixed(2)}" r="${padR}" ${fillAttr} />`;
        if (hasTop) circuitGroup += `<rect x="${(cxn - halfTrace).toFixed(2)}" y="${yn.toFixed(2)}" width="${traceW}" height="${halfCell}" ${fillAttr} />`;
        if (hasBottom) circuitGroup += `<rect x="${(cxn - halfTrace).toFixed(2)}" y="${cyn.toFixed(2)}" width="${traceW}" height="${halfCell}" ${fillAttr} />`;
        if (hasLeft) circuitGroup += `<rect x="${xn.toFixed(2)}" y="${(cyn - halfTrace).toFixed(2)}" width="${halfCell}" height="${traceW}" ${fillAttr} />`;
        if (hasRight) circuitGroup += `<rect x="${cxn.toFixed(2)}" y="${(cyn - halfTrace).toFixed(2)}" width="${halfCell}" height="${traceW}" ${fillAttr} />`;

        if (!hasTop && !hasBottom && !hasLeft && !hasRight) {
          circuitGroup = `<circle cx="${cxn.toFixed(2)}" cy="${cyn.toFixed(2)}" r="${(modSize * 0.38).toFixed(2)}" ${fillAttr} />`;
        }
        modulesXml += circuitGroup;
      } else if (moduleShape === "donut") {
        const cxn = (c + quietZone + 0.5) * modSize;
        const cyn = (r + quietZone + 0.5) * modSize;
        const rOut = modSize * 0.44;
        const rIn = modSize * 0.22;
        const d = `M ${(cxn - rOut).toFixed(2)} ${cyn.toFixed(2)} A ${rOut.toFixed(2)} ${rOut.toFixed(2)} 0 1 0 ${(cxn + rOut).toFixed(2)} ${cyn.toFixed(2)} A ${rOut.toFixed(2)} ${rOut.toFixed(2)} 0 1 0 ${(cxn - rOut).toFixed(2)} ${cyn.toFixed(2)} Z M ${(cxn - rIn).toFixed(2)} ${cyn.toFixed(2)} A ${rIn.toFixed(2)} ${rIn.toFixed(2)} 0 1 1 ${(cxn + rIn).toFixed(2)} ${cyn.toFixed(2)} A ${rIn.toFixed(2)} ${rIn.toFixed(2)} 0 1 1 ${(cxn - rIn).toFixed(2)} ${cyn.toFixed(2)} Z`;
        modulesXml += `<path d="${d}" fill-rule="evenodd" ${fillAttr} />`;
      } else if (moduleShape === "rhombus") {
        const xn = (c + quietZone) * modSize;
        const yn = (r + quietZone) * modSize;
        const slant = modSize * 0.22;
        const pts = `${(xn + slant).toFixed(2)},${yn.toFixed(2)} ${(xn + modSize).toFixed(2)},${yn.toFixed(2)} ${(xn + modSize - slant).toFixed(2)},${(yn + modSize).toFixed(2)} ${xn.toFixed(2)},${(yn + modSize).toFixed(2)}`;
        modulesXml += `<polygon points="${pts}" ${fillAttr} />`;
      } else if (moduleShape === "mosaic") {
        const xn = (c + quietZone) * modSize;
        const yn = (r + quietZone) * modSize;
        const gap = modSize * 0.1;
        const sub = (modSize - gap) / 2;
        const rx = (sub * 0.3).toFixed(2);
        const subStr = sub.toFixed(2);
        const xn2 = (xn + sub + gap).toFixed(2);
        const yn2 = (yn + sub + gap).toFixed(2);
        const mode = (r + c) % 3;

        if (mode === 0) {
          modulesXml += `<rect x="${xn.toFixed(2)}" y="${yn.toFixed(2)}" width="${subStr}" height="${subStr}" rx="${rx}" ${fillAttr} />`;
          modulesXml += `<rect x="${xn2}" y="${yn.toFixed(2)}" width="${subStr}" height="${subStr}" rx="${rx}" ${fillAttr} />`;
          modulesXml += `<rect x="${xn.toFixed(2)}" y="${yn2}" width="${subStr}" height="${subStr}" rx="${rx}" ${fillAttr} />`;
          modulesXml += `<rect x="${xn2}" y="${yn2}" width="${subStr}" height="${subStr}" rx="${rx}" ${fillAttr} />`;
        } else if (mode === 1) {
          modulesXml += `<rect x="${xn.toFixed(2)}" y="${yn.toFixed(2)}" width="${subStr}" height="${subStr}" rx="${rx}" ${fillAttr} />`;
          modulesXml += `<rect x="${xn2}" y="${yn2}" width="${subStr}" height="${subStr}" rx="${rx}" ${fillAttr} />`;
          const cxn = (xn + modSize / 2).toFixed(2);
          const cyn = (yn + modSize / 2).toFixed(2);
          const dR = (sub * 0.5).toFixed(2);
          modulesXml += `<polygon points="${cxn},${(yn + modSize/2 - sub*0.5).toFixed(2)} ${(xn + modSize/2 + sub*0.5).toFixed(2)},${cyn} ${cxn},${(yn + modSize/2 + sub*0.5).toFixed(2)} ${(xn + modSize/2 - sub*0.5).toFixed(2)},${cyn}" ${fillAttr} />`;
        } else {
          modulesXml += `<rect x="${xn.toFixed(2)}" y="${yn.toFixed(2)}" width="${(sub * 1.5).toFixed(2)}" height="${(sub * 1.5).toFixed(2)}" rx="${rx}" ${fillAttr} />`;
          modulesXml += `<rect x="${xn2}" y="${yn2}" width="${subStr}" height="${subStr}" rx="${rx}" ${fillAttr} />`;
        }
      }
    }
  }

  // Finder eyes SVG
  const findersXml = `
    ${getFinderEyeSvg(quietZone * modSize, quietZone * modSize, modSize, finderShape, bestContrastColor, bgColor, "tl", eyePupilShape)}
    ${getFinderEyeSvg((moduleCount - 7 + quietZone) * modSize, quietZone * modSize, modSize, finderShape, bestContrastColor, bgColor, "tr", eyePupilShape)}
    ${getFinderEyeSvg(quietZone * modSize, (moduleCount - 7 + quietZone) * modSize, modSize, finderShape, bestContrastColor, bgColor, "bl", eyePupilShape)}
  `;

  // Container XML
  const containerXml = getCodeContainerSvg(svgSize, codeContainer, bgColor, bestContrastColor);

  // Logo XML
  let logoXml = "";
  if (logoSrc) {
    const logoPixelSize = ((logoSizePercent / 100) * (moduleCount * modSize)).toFixed(2);
    const cx = (svgSize / 2).toFixed(2);
    const cy = (svgSize / 2).toFixed(2);
    const lx = (svgSize / 2 - parseFloat(logoPixelSize) / 2).toFixed(2);
    const ly = (svgSize / 2 - parseFloat(logoPixelSize) / 2).toFixed(2);
    const pad = (modSize * 0.25).toFixed(2);

    if (logoBacking === "circle") {
      const radius = ((parseFloat(logoPixelSize) + parseFloat(pad)) / 2).toFixed(2);
      logoXml += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${logoBackingColor}" />`;
    } else if (logoBacking === "rounded") {
      const bSize = (parseFloat(logoPixelSize) + parseFloat(pad)).toFixed(2);
      const bx = (parseFloat(lx) - parseFloat(pad) / 2).toFixed(2);
      const by = (parseFloat(ly) - parseFloat(pad) / 2).toFixed(2);
      const rx = (parseFloat(bSize) * 0.22).toFixed(2);
      logoXml += `<rect x="${bx}" y="${by}" width="${bSize}" height="${bSize}" rx="${rx}" fill="${logoBackingColor}" />`;
    } else if (logoBacking === "square") {
      const bSize = (parseFloat(logoPixelSize) + parseFloat(pad)).toFixed(2);
      const bx = (parseFloat(lx) - parseFloat(pad) / 2).toFixed(2);
      const by = (parseFloat(ly) - parseFloat(pad) / 2).toFixed(2);
      logoXml += `<rect x="${bx}" y="${by}" width="${bSize}" height="${bSize}" fill="${logoBackingColor}" />`;
    }

    logoXml += `<image href="${logoSrc}" x="${lx}" y="${ly}" width="${logoPixelSize}" height="${logoPixelSize}" />`;
  }

  const bgRectXml = bgColor.toLowerCase() === "transparent" ? "" : `  <rect width="100%" height="100%" fill="${bgColor}" />\n`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgSize} ${svgSize}" width="${svgSize}" height="${svgSize}">
${bgRectXml}  ${defsXml}
  ${containerXml}
  ${modulesXml}
  ${findersXml}
  ${logoXml}
</svg>`;
}
