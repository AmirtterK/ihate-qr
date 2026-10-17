"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { generateQRMatrix, QRCodeData } from "@/lib/qr-code";
import {
  FinderShape,
  ModuleShape,
  ColorMode,
  LogoBacking,
  Preset,
  SafetyReport,
} from "@/lib/qr-types";
import {
  getContrastRatio,
  renderQRToCanvas,
  generateQRSvgString,
} from "@/lib/qr-render";

import { Header } from "@/components/header";
import { LinkWidget } from "@/components/widgets/link-widget";
import { StyleWidget } from "@/components/widgets/style-widget";
import { PreviewWidget } from "@/components/widgets/preview-widget";
import { LogoWidget } from "@/components/widgets/logo-widget";

export function QRStudio() {
  // Inputs
  const [url, setUrl] = useState("https://github.com");
  const [palette, setPalette] = useState<string[]>(["#E11D48", "#18181B"]);
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const [seed, setSeed] = useState("48291");
  const [finderShape, setFinderShape] = useState<FinderShape>("square");
  const [moduleShape, setModuleShape] = useState<ModuleShape>("square");
  const [colorMode, setColorMode] = useState<ColorMode>("scatter");

  // Logo state
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [logoName, setLogoName] = useState("");
  const [logoSizePercent, setLogoSizePercent] = useState(18); // 10% to 25%
  const [logoBacking, setLogoBacking] = useState<LogoBacking>("rounded");
  const [logoBackingColor, setLogoBackingColor] = useState("#FFFFFF");

  // UI state
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  // Determine the color with the highest contrast against the background (for finder eyes)
  const bestContrastColor = useMemo(() => {
    if (palette.length === 0) return bgColor === "#FFFFFF" ? "#000000" : "#FFFFFF";
    let best = palette[0];
    let maxRatio = -1;
    for (const color of palette) {
      const ratio = getContrastRatio(color, bgColor);
      if (ratio > maxRatio) {
        maxRatio = ratio;
        best = color;
      }
    }
    return best;
  }, [palette, bgColor]);

  // Scan-Safety diagnostics
  const safetyReport: SafetyReport = useMemo(() => {
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

    // Best contrast check (finders)
    const finderRatio = getContrastRatio(bestContrastColor, bgColor);
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
  }, [palette, bgColor, bestContrastColor, logoSrc, logoSizePercent]);

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
      renderQRToCanvas({
        targetCanvas,
        targetSize,
        qrData,
        palette,
        bgColor,
        bestContrastColor,
        seed,
        finderShape,
        moduleShape,
        colorMode,
        logoSrc,
        logoImage,
        logoSizePercent,
        logoBacking,
        logoBackingColor,
      });
    },
    [
      qrData,
      palette,
      bgColor,
      bestContrastColor,
      seed,
      finderShape,
      moduleShape,
      colorMode,
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
    if (palette.length > 1) {
      setPalette(palette.filter((_, i) => i !== index));
    }
  };

  const applyPreset = (preset: Preset) => {
    setPalette([...preset.colors]);
    setBgColor(preset.bg);
    if (preset.finderShape) setFinderShape(preset.finderShape);
    if (preset.moduleShape) setModuleShape(preset.moduleShape);
    if (preset.colorMode) setColorMode(preset.colorMode);
    setSeed(Math.floor(10000 + Math.random() * 900000).toString());
  };

  const shuffleColors = () => {
    setSeed(Math.floor(10000 + Math.random() * 900000).toString());
    setPalette((prev) => {
      if (prev.length <= 1) return prev;
      const next = [...prev];
      const first = next.shift()!;
      next.push(first);
      return next;
    });
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
    const svgContent = generateQRSvgString({
      qrData,
      palette,
      bgColor,
      bestContrastColor,
      seed,
      finderShape,
      moduleShape,
      colorMode,
      logoSrc,
      logoSizePercent,
      logoBacking,
      logoBackingColor,
    });

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

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top Navigation */}
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onShuffle={shuffleColors}
      />

      {/* Responsive Layout: On mobile -> Link (1) -> QR (2) -> Style (3) -> Logo/Dropzone (4) | On desktop -> 3 columns */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[auto_1fr] gap-6 items-start">
          
          {/* WIDGET 1: Content to Encode (Link widget) - Mobile: 1st, Desktop: Col 1-4 Row 1 */}
          <div className="order-1 lg:order-none lg:col-start-1 lg:col-span-4 lg:row-start-1">
            <LinkWidget
              url={url}
              onUrlChange={setUrl}
            />
          </div>

          {/* WIDGET 2: QR Code Preview - Mobile: 2nd, Desktop: Col 5-8 Rows 1-2 (sticky) */}
          <div className="order-2 lg:order-none lg:col-start-5 lg:col-span-4 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-20 space-y-5">
            <PreviewWidget
              canvasRef={canvasRef}
              safetyReport={safetyReport}
              onDownloadPng={downloadPng}
              onDownloadSvg={downloadSvg}
              onShuffle={shuffleColors}
              onCopy={copyToClipboard}
              copied={copied}
            />
          </div>

          {/* WIDGET 3: Style & Colors widget - Mobile: 3rd, Desktop: Col 9-12 Rows 1-2 */}
          <div className="order-3 lg:order-none lg:col-start-9 lg:col-span-4 lg:row-start-1 lg:row-span-2 space-y-6">
            <StyleWidget
              palette={palette}
              bgColor={bgColor}
              bestContrastColor={bestContrastColor}
              finderShape={finderShape}
              moduleShape={moduleShape}
              colorMode={colorMode}
              onApplyPreset={applyPreset}
              onFinderShapeChange={setFinderShape}
              onModuleShapeChange={setModuleShape}
              onColorModeChange={setColorMode}
              onBgColorChange={setBgColor}
              onAddColor={addColor}
              onUpdateColor={updateColor}
              onRemoveColor={removeColor}
              onShuffle={shuffleColors}
            />
          </div>

          {/* WIDGET 4: Center Logo (Image drop) - Mobile: 4th, Desktop: Col 1-4 Row 2 */}
          <div className="order-4 lg:order-none lg:col-start-1 lg:col-span-4 lg:row-start-2">
            <LogoWidget
              logoSrc={logoSrc}
              logoName={logoName}
              logoSizePercent={logoSizePercent}
              logoBacking={logoBacking}
              logoBackingColor={logoBackingColor}
              onLogoUpload={handleLogoUpload}
              onRemoveLogo={removeLogo}
              onLogoSizeChange={setLogoSizePercent}
              onLogoBackingChange={setLogoBacking}
              onLogoBackingColorChange={setLogoBackingColor}
            />
          </div>

        </div>
      </main>
    </div>
  );
}
