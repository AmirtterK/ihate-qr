"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { generateQRMatrix, QRCodeData } from "@/lib/qr-code";
import { exportToA4Pdf } from "@/lib/pdf-export";
import {
  QrCode,
  Download,
  Shuffle,
  FileText,
  Copy,
  Check,
  Upload,
  Trash2,
  Plus,
  Sun,
  Moon,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Palette,
  Printer
} from "lucide-react";

// Color presets
interface Preset {
  name: string;
  colors: string[];
  bg: string;
}

const PRESETS: Preset[] = [
  { name: "Crimson & Noir", colors: ["#E11D48", "#18181B"], bg: "#FFFFFF" },
  { name: "Ocean & Navy", colors: ["#0284C7", "#0F172A"], bg: "#FFFFFF" },
  { name: "Forest & Emerald", colors: ["#16A34A", "#064E3B"], bg: "#FFFFFF" },
  { name: "Sunset Flame", colors: ["#EA580C", "#DC2626", "#450A0A"], bg: "#FFFFFF" },
  { name: "Cyberpunk Neon", colors: ["#D946EF", "#06B6D4", "#0F172A"], bg: "#FFFFFF" },
  { name: "Royal Purple", colors: ["#9333EA", "#3B0764"], bg: "#FFFFFF" },
  { name: "Monochrome Classic", colors: ["#09090B", "#52525B"], bg: "#FFFFFF" },
];

// Helper: Hex to RGB
function hexToRgb(hex: string): [number, number, number] {
  let cleaned = hex.replace("#", "").trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split("").map((c) => c + c).join("");
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return [0, 0, 0];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// Helper: Relative Luminance (WCAG)
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Helper: Contrast Ratio
function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const l1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const l2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Seeded PRNG (Mulberry32)
function createRng(seedStr: string) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(31, h) + seedStr.charCodeAt(i) | 0;
  }
  let a = h >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function QRStudio() {
  // Inputs
  const [url, setUrl] = useState("https://github.com");
  const [palette, setPalette] = useState<string[]>(["#E11D48", "#18181B"]);
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const [seed, setSeed] = useState("48291");
  const [moduleShape, setModuleShape] = useState<"square" | "rounded" | "dots">("square");

  // Logo state
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [logoName, setLogoName] = useState("");
  const [logoSizePercent, setLogoSizePercent] = useState(18); // 10% to 25%
  const [logoBacking, setLogoBacking] = useState<"rounded" | "circle" | "square" | "none">("rounded");
  const [logoBackingColor, setLogoBackingColor] = useState("#FFFFFF");

  // Print Sheet options
  const [pdfCodeSize, setPdfCodeSize] = useState(60);
  const [pdfColumns, setPdfColumns] = useState(3);
  const [pdfCount, setPdfCount] = useState(12);
  const [pdfCutLines, setPdfCutLines] = useState(true);

  // UI state
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [copied, setCopied] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Normalize URL with auto-prefix
  const normalizedUrl = useMemo(() => {
    const trimmed = url.trim();
    if (!trimmed) return "https://example.com";
    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("mailto:") ||
      trimmed.startsWith("tel:")
    ) {
      return trimmed;
    }
    return `https://${trimmed}`;
  }, [url]);

  // Find the darkest color in palette for finder patterns
  const darkestColor = useMemo(() => {
    if (palette.length === 0) return "#000000";
    let darkest = palette[0];
    let minLum = 1.0;
    for (const color of palette) {
      const [r, g, b] = hexToRgb(color);
      const lum = getLuminance(r, g, b);
      if (lum < minLum) {
        minLum = lum;
        darkest = color;
      }
    }
    return darkest;
  }, [palette]);

  // Scan-Safety diagnostics
  const safetyReport = useMemo(() => {
    const warnings: { type: "contrast" | "logo"; message: string; critical: boolean }[] = [];

    // Contrast check: each palette color against background
    palette.forEach((color, idx) => {
      const ratio = getContrastRatio(color, bgColor);
      if (ratio < 3.0) {
        warnings.push({
          type: "contrast",
          critical: true,
          message: `Color ${idx + 1} (${color}) has low contrast (${ratio.toFixed(1)}:1) against background. Scanners may struggle.`,
        });
      } else if (ratio < 4.5) {
        warnings.push({
          type: "contrast",
          critical: false,
          message: `Color ${idx + 1} (${color}) has moderate contrast (${ratio.toFixed(1)}:1). Darker color recommended.`,
        });
      }
    });

    // Darkest color contrast check (finders)
    const finderRatio = getContrastRatio(darkestColor, bgColor);
    if (finderRatio < 4.0) {
      warnings.push({
        type: "contrast",
        critical: true,
        message: `Finder patterns have low contrast (${finderRatio.toFixed(1)}:1). Scanners will fail to acquire code.`,
      });
    }

    // Logo size check
    if (logoSrc) {
      if (logoSizePercent > 22) {
        warnings.push({
          type: "logo",
          critical: true,
          message: `Logo covers ${logoSizePercent}% of width. Near Error Correction H safety limit (25%). Test carefully.`,
        });
      }
    }

    const isSafe = warnings.filter((w) => w.critical).length === 0;
    return { isSafe, warnings };
  }, [palette, bgColor, darkestColor, logoSrc, logoSizePercent]);

  // Generate QR Matrix
  const qrData: QRCodeData = useMemo(() => {
    try {
      return generateQRMatrix(normalizedUrl, "H");
    } catch (e) {
      console.error("QR Generation error:", e);
      return generateQRMatrix("https://example.com", "H");
    }
  }, [normalizedUrl]);

  // Render QR Code onto Canvas
  const renderCanvas = useCallback(
    (targetCanvas: HTMLCanvasElement, targetSize = 1024) => {
      const ctx = targetCanvas.getContext("2d");
      if (!ctx) return;

      const { size: moduleCount, modules, isFinderPattern } = qrData;
      targetCanvas.width = targetSize;
      targetCanvas.height = targetSize;

      // 4-module quiet zone
      const quietZone = 4;
      const totalModules = moduleCount + quietZone * 2;
      const modulePixelSize = targetSize / totalModules;

      // Fill background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, targetSize, targetSize);

      // Deterministic PRNG for module colors
      const rng = createRng(seed);

      // Tight logo clearance: exactly clear the modules covered by the logo without excess gap
      let logoLeftMod = -1;
      let logoRightMod = -1;
      let logoTopMod = -1;
      let logoBottomMod = -1;

      if (logoSrc) {
        const logoModules = (logoSizePercent / 100) * moduleCount;
        const center = moduleCount / 2;
        const half = logoModules / 2;
        // Tight clearance with zero extra margin so modules sit right up to the logo
        logoLeftMod = Math.floor(center - half);
        logoRightMod = Math.ceil(center + half) - 1;
        logoTopMod = Math.floor(center - half);
        logoBottomMod = Math.ceil(center + half) - 1;
      }

      // Draw modules
      for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
          if (!modules[r][c]) continue;

          // Clear modules under logo area
          if (
            logoSrc &&
            r >= logoTopMod &&
            r <= logoBottomMod &&
            c >= logoLeftMod &&
            c <= logoRightMod
          ) {
            continue;
          }

          const x = (c + quietZone) * modulePixelSize;
          const y = (r + quietZone) * modulePixelSize;

          let color = darkestColor;
          if (!isFinderPattern[r][c]) {
            // Randomly assign from palette
            const colorIdx = Math.floor(rng() * palette.length);
            color = palette[colorIdx];
          }

          ctx.fillStyle = color;

          if (isFinderPattern[r][c] || moduleShape === "square") {
            ctx.fillRect(x, y, modulePixelSize + 0.3, modulePixelSize + 0.3);
          } else if (moduleShape === "rounded") {
            const rad = modulePixelSize * 0.35;
            ctx.beginPath();
            ctx.roundRect(x, y, modulePixelSize, modulePixelSize, rad);
            ctx.fill();
          } else if (moduleShape === "dots") {
            ctx.beginPath();
            ctx.arc(
              x + modulePixelSize / 2,
              y + modulePixelSize / 2,
              modulePixelSize * 0.44,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
        }
      }

      // Draw Logo if present
      if (logoImage && logoSrc) {
        const logoPixelSize = (logoSizePercent / 100) * (moduleCount * modulePixelSize);
        const cx = targetSize / 2;
        const cy = targetSize / 2;
        const lx = cx - logoPixelSize / 2;
        const ly = cy - logoPixelSize / 2;

        // Subtle tight backing plate
        if (logoBacking !== "none") {
          const pad = modulePixelSize * 0.25; // Subtle tight padding
          ctx.fillStyle = logoBackingColor;
          if (logoBacking === "circle") {
            ctx.beginPath();
            ctx.arc(cx, cy, (logoPixelSize + pad) / 2, 0, Math.PI * 2);
            ctx.fill();
          } else if (logoBacking === "rounded") {
            ctx.beginPath();
            ctx.roundRect(
              lx - pad / 2,
              ly - pad / 2,
              logoPixelSize + pad,
              logoPixelSize + pad,
              (logoPixelSize + pad) * 0.22
            );
            ctx.fill();
          } else {
            ctx.fillRect(lx - pad / 2, ly - pad / 2, logoPixelSize + pad, logoPixelSize + pad);
          }
        }

        // Draw image centered & contained
        ctx.drawImage(logoImage, lx, ly, logoPixelSize, logoPixelSize);
      }
    },
    [
      qrData,
      palette,
      bgColor,
      darkestColor,
      seed,
      moduleShape,
      logoSrc,
      logoImage,
      logoSizePercent,
      logoBacking,
      logoBackingColor,
    ]
  );

  // Render on preview canvas when inputs change
  useEffect(() => {
    if (canvasRef.current) {
      renderCanvas(canvasRef.current, 760);
    }
  }, [renderCanvas]);

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const src = evt.target?.result as string;
      setLogoSrc(src);
      const img = new Image();
      img.onload = () => setLogoImage(img);
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoSrc(null);
    setLogoImage(null);
    setLogoName("");
  };

  // Palette color operations
  const addColor = () => {
    if (palette.length < 8) {
      setPalette([...palette, "#3B82F6"]);
    }
  };

  const updateColor = (index: number, val: string) => {
    const next = [...palette];
    next[index] = val;
    setPalette(next);
  };

  const removeColor = (index: number) => {
    if (palette.length > 2) {
      setPalette(palette.filter((_, i) => i !== index));
    }
  };

  const applyPreset = (preset: Preset) => {
    setPalette([...preset.colors]);
    setBgColor(preset.bg);
  };

  const shuffleColors = () => {
    setSeed(Math.floor(10000 + Math.random() * 900000).toString());
  };

  // Downloads
  const downloadPng = () => {
    const exportCanvas = document.createElement("canvas");
    renderCanvas(exportCanvas, 2048);
    const link = document.createElement("a");
    link.download = `mixed-qr-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
  };

  const downloadSvg = () => {
    const { size: moduleCount, modules, isFinderPattern } = qrData;
    const quietZone = 4;
    const totalModules = moduleCount + quietZone * 2;
    const svgSize = 1024;
    const modSize = svgSize / totalModules;

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

    // Group rects by color
    const colorGroups: Record<string, string[]> = {};
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (!modules[r][c]) continue;
        if (
          logoSrc &&
          r >= logoTopMod &&
          r <= logoBottomMod &&
          c >= logoLeftMod &&
          c <= logoRightMod
        ) {
          continue;
        }

        const x = ((c + quietZone) * modSize).toFixed(2);
        const y = ((r + quietZone) * modSize).toFixed(2);
        const w = (modSize + 0.1).toFixed(2);

        let color = darkestColor;
        if (!isFinderPattern[r][c]) {
          const colorIdx = Math.floor(rng() * palette.length);
          color = palette[colorIdx];
        }

        if (!colorGroups[color]) colorGroups[color] = [];
        colorGroups[color].push(`<rect x="${x}" y="${y}" width="${w}" height="${w}" />`);
      }
    }

    let groupsXml = "";
    for (const [color, rects] of Object.entries(colorGroups)) {
      groupsXml += `<g fill="${color}">${rects.join("")}</g>`;
    }

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

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgSize} ${svgSize}" width="${svgSize}" height="${svgSize}">
  <rect width="100%" height="100%" fill="${bgColor}" />
  ${groupsXml}
  ${logoXml}
</svg>`;

    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `mixed-qr-${Date.now()}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    try {
      const exportCanvas = document.createElement("canvas");
      renderCanvas(exportCanvas, 1024);
      exportCanvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const exportCanvas = document.createElement("canvas");
      renderCanvas(exportCanvas, 1024);
      const dataUrl = exportCanvas.toDataURL("image/png");

      await exportToA4Pdf({
        codeSizeMm: Number(pdfCodeSize) || 60,
        columns: Number(pdfColumns) || 3,
        count: Number(pdfCount) || 12,
        includeCutLines: pdfCutLines,
        qrPngDataUrl: dataUrl,
        label: url.replace(/^https?:\/\//, ""),
      });
    } catch (e: any) {
      alert(`PDF Export: ${e.message || "Failed to generate PDF"}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-sm">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-base tracking-tight">Mixed Palette QR Studio</span>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Custom styled QR code generator
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={shuffleColors}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border hover:bg-secondary text-xs font-medium transition"
              title="Shuffle Mixed Palette"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Shuffle</span>
            </button>
            <button
              onClick={toggleTheme}
              className="h-9 w-9 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition"
              title="Toggle Dark/Light Mode"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main 3-Column Layout */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUMN 1 (LEFT): Content & Colors (lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-6">
            {/* CARD 1: Content & URL */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-sm">Content to Encode</h2>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                  Required
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter a URL or text.
              </p>
              <div className="space-y-2">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="e.g. yourbrand.com or https://example.com"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* CARD 2: Color Palette */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-sm">Color Palette & Mixed Style</h2>
                </div>
                <button
                  onClick={addColor}
                  disabled={palette.length >= 8}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border border-border hover:bg-secondary disabled:opacity-50 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Color
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Customize colors and module shape.
              </p>

              {/* Presets */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Preset Palettes</label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => applyPreset(p)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-secondary/50 hover:bg-secondary text-xs transition"
                    >
                      <div className="flex -space-x-1">
                        {p.colors.map((c, i) => (
                          <div
                            key={i}
                            className="w-2.5 h-2.5 rounded-full border border-background"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <span className="text-[11px]">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Color */}
              <div className="pt-2 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex justify-between">
                    <span>Background Canvas</span>
                    <span className="font-mono text-xs uppercase text-foreground">{bgColor}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-9 h-9 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="h-9 px-3 rounded-md border border-input bg-background font-mono text-xs uppercase flex-1"
                      maxLength={7}
                    />
                  </div>
                </div>

                {/* Module Corner Style */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground block">Corner Style</label>
                  <select
                    value={moduleShape}
                    onChange={(e: any) => setModuleShape(e.target.value)}
                    className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="square">Squares</option>
                    <option value="rounded">Rounded</option>
                    <option value="dots">Dots</option>
                  </select>
                </div>

                {/* Module Colors */}
                <div className="sm:col-span-2 space-y-2 pt-1 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">
                      Module Colors ({palette.length} active)
                    </label>
                    <button
                      onClick={shuffleColors}
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
                    >
                      <Shuffle className="w-3 h-3" />
                      Shuffle Pattern
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {palette.map((color, idx) => {
                      const isDarkest = color === darkestColor;
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 p-1.5 rounded-lg border border-border bg-secondary/30"
                        >
                          <input
                            type="color"
                            value={color}
                            onChange={(e) => updateColor(idx, e.target.value)}
                            className="w-7 h-7 rounded cursor-pointer shrink-0"
                          />
                          <input
                            type="text"
                            value={color}
                            onChange={(e) => updateColor(idx, e.target.value)}
                            className="h-7 px-2 rounded border border-input bg-background font-mono text-[11px] uppercase w-20"
                            maxLength={7}
                          />
                          <div className="flex-1">
                            {isDarkest && (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                Lock
                              </span>
                            )}
                          </div>
                          {palette.length > 2 && (
                            <button
                              onClick={() => removeColor(idx)}
                              className="text-muted-foreground hover:text-destructive p-1 transition"
                              title="Remove color"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 2 (CENTER): Live Preview & Quick Actions (lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">
            <div className="rounded-xl border border-border bg-card p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <h3 className="font-semibold text-sm">QR Code Preview</h3>
                </div>
                <div
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    safetyReport.isSafe
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                  }`}
                >
                  {safetyReport.isSafe ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" /> Scan Ready
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3" /> Warning
                    </>
                  )}
                </div>
              </div>

              {/* Canvas Frame */}
              <div className="py-2 flex flex-col items-center justify-center">
                <div className="p-3 rounded-2xl border border-border shadow-inner bg-card flex items-center justify-center max-w-full">
                  <canvas ref={canvasRef} className="max-w-full h-auto rounded-lg shadow-sm w-[320px] h-[320px]" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={downloadPng}
                    className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download PNG
                  </button>
                  <button
                    onClick={downloadSvg}
                    className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-md border border-input bg-background hover:bg-secondary text-sm font-medium transition"
                  >
                    <Download className="w-4 h-4" />
                    Download SVG
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <button
                    onClick={shuffleColors}
                    className="hover:text-foreground transition flex items-center gap-1 font-medium text-foreground"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    Shuffle Pattern
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className="hover:text-foreground transition underline flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied!" : "Copy to Clipboard"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 3 (RIGHT): Center Logo & Print Sheet (lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-6">
            {/* CARD 3: Center Logo */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-sm">Center Logo (Optional)</h2>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                  {logoSrc ? "Active" : "None"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Embed an image or logo in the center.
              </p>

              {/* Upload Dropzone */}
              {!logoSrc ? (
                <label className="border-2 border-dashed border-border hover:border-primary/50 transition rounded-lg p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-secondary/20 group">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleLogoUpload}
                    className="sr-only"
                  />
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-primary transition">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-medium">Click or drag & drop logo</div>
                  <div className="text-[11px] text-muted-foreground">PNG, JPG, SVG, WebP</div>
                </label>
              ) : (
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-secondary/20">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={logoSrc}
                      alt="Logo"
                      className="w-9 h-9 object-contain rounded border border-border bg-white p-0.5"
                    />
                    <div>
                      <div className="text-xs font-medium truncate max-w-[140px]">{logoName}</div>
                      <div className="text-[10px] text-muted-foreground">Centered tightly</div>
                    </div>
                  </div>
                  <button
                    onClick={removeLogo}
                    className="text-xs px-2 py-1 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10 transition"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Logo Controls */}
              {logoSrc && (
                <div className="space-y-3 pt-1 border-t border-border">
                  <div>
                    <div className="flex justify-between text-xs font-medium mb-1.5">
                      <span className="text-muted-foreground">Logo Size (% of QR width)</span>
                      <span className="font-mono">{logoSizePercent}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={25}
                      step={1}
                      value={logoSizePercent}
                      onChange={(e) => setLogoSizePercent(Number(e.target.value))}
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>10% (Safe)</span>
                      <span>18% (Recommended)</span>
                      <span>25% (Max)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground block">Backing Plate</label>
                      <select
                        value={logoBacking}
                        onChange={(e: any) => setLogoBacking(e.target.value)}
                        className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                      >
                        <option value="rounded">Rounded Square</option>
                        <option value="circle">Circle</option>
                        <option value="square">Square</option>
                        <option value="none">None (Transparent)</option>
                      </select>
                    </div>

                    {logoBacking !== "none" && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground flex justify-between">
                          <span>Backing Color</span>
                          <span className="font-mono text-xs uppercase">{logoBackingColor}</span>
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={logoBackingColor}
                            onChange={(e) => setLogoBackingColor(e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={logoBackingColor}
                            onChange={(e) => setLogoBackingColor(e.target.value)}
                            className="h-8 px-2 rounded-md border border-input bg-background font-mono text-xs uppercase flex-1"
                            maxLength={7}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* CARD 4: Print Sheet PDF (Commented out)
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-sm">A4 Print Sheet (PDF)</h2>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Export multiple codes on A4 paper for printing.
              </p>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Size (mm)</label>
                  <input
                    type="number"
                    min={20}
                    max={150}
                    value={pdfCodeSize}
                    onChange={(e) => setPdfCodeSize(Number(e.target.value))}
                    className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground">Def: 60mm</span>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Columns</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={pdfColumns}
                    onChange={(e) => setPdfColumns(Number(e.target.value))}
                    className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground">Def: 3 cols</span>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Codes</label>
                  <input
                    type="number"
                    min={1}
                    max={48}
                    value={pdfCount}
                    onChange={(e) => setPdfCount(Number(e.target.value))}
                    className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground">Def: 12</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2 border-t border-border">
                <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={pdfCutLines}
                    onChange={(e) => setPdfCutLines(e.target.checked)}
                    className="rounded border-input text-primary"
                  />
                  <span>Include subtle cut guidelines & labels</span>
                </label>
                <button
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {isExportingPdf ? "Generating..." : "Export A4 Print PDF"}
                </button>
              </div>
            </div>
            */}
          </div>

        </div>
      </main>
    </div>
  );
}
