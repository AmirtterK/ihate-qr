"use client";

import React from "react";
import { Palette, Plus, Shuffle, Trash2 } from "lucide-react";
import { FinderShape, ModuleShape, ColorMode, Preset, PRESETS } from "@/lib/qr-types";

interface StyleWidgetProps {
  palette: string[];
  bgColor: string;
  bestContrastColor: string;
  finderShape: FinderShape;
  moduleShape: ModuleShape;
  colorMode: ColorMode;
  onApplyPreset: (preset: Preset) => void;
  onFinderShapeChange: (shape: FinderShape) => void;
  onModuleShapeChange: (shape: ModuleShape) => void;
  onColorModeChange: (mode: ColorMode) => void;
  onBgColorChange: (color: string) => void;
  onAddColor: () => void;
  onUpdateColor: (index: number, color: string) => void;
  onRemoveColor: (index: number) => void;
  onShuffle: () => void;
}

export function StyleWidget({
  palette,
  bgColor,
  bestContrastColor,
  finderShape,
  moduleShape,
  colorMode,
  onApplyPreset,
  onFinderShapeChange,
  onModuleShapeChange,
  onColorModeChange,
  onBgColorChange,
  onAddColor,
  onUpdateColor,
  onRemoveColor,
  onShuffle,
}: StyleWidgetProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm">Style & Colors</h2>
        </div>
        <button
          onClick={onAddColor}
          disabled={palette.length >= 8}
          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border border-border hover:bg-secondary disabled:opacity-50 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Color
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Customize palette, eye shapes, and artistic flow.
      </p>

      {/* Presets */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Preset Palettes & Styles</label>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => onApplyPreset(p)}
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

      {/* Artistic Style Selectors */}
      <div className="pt-2 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Eye Style */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground block">Eye Shape</label>
          <select
            value={finderShape}
            onChange={(e) => onFinderShapeChange(e.target.value as FinderShape)}
            className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="square">Squares</option>
            <option value="circle">Circles</option>
            <option value="leaf">Leaf</option>
            <option value="chamfer">Chamfer</option>
          </select>
        </div>

        {/* Module Shape */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground block">Module Geometry</label>
          <select
            value={moduleShape}
            onChange={(e) => onModuleShapeChange(e.target.value as ModuleShape)}
            className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="square">Squares</option>
            <option value="rounded">Rounded</option>
            <option value="dots">Dots</option>
            <option value="diamond">Diamonds</option>
            <option value="fluid">Fluid</option>
            <option value="liquid">Liquid</option>
          </select>
        </div>

        {/* Color Flow Mode */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground block">Color Flow</label>
          <select
            value={colorMode}
            onChange={(e) => onColorModeChange(e.target.value as ColorMode)}
            className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="scatter">Scattered</option>
            <option value="gradient">Linear Gradient</option>
            <option value="radial">Radial Glow</option>
          </select>
        </div>

        {/* Background Canvas */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">
              Background Canvas
            </label>
            <button
              type="button"
              onClick={() => onBgColorChange(bgColor.toLowerCase() === "transparent" ? "#FFFFFF" : "transparent")}
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition border ${
                bgColor.toLowerCase() === "transparent"
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground border-border"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-sm border border-current/30 bg-checkerboard inline-block shrink-0" />
              Transparent
            </button>
          </div>
          <div className="flex items-center gap-2">
            {bgColor.toLowerCase() === "transparent" ? (
              <div className="flex items-center gap-2 w-full h-9 px-3 rounded-md border border-input bg-secondary/30 text-xs text-muted-foreground">
                <span className="w-5 h-5 rounded border border-border bg-checkerboard shrink-0" />
                <span className="font-mono text-xs">transparent (alpha: 0)</span>
              </div>
            ) : (
              <>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => onBgColorChange(e.target.value)}
                  className="w-9 h-9 rounded cursor-pointer shrink-0"
                />
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => onBgColorChange(e.target.value)}
                  className="h-9 px-2.5 rounded-md border border-input bg-background font-mono text-xs uppercase flex-1"
                  maxLength={7}
                />
              </>
            )}
          </div>
        </div>

        {/* Module Colors */}
        <div className="sm:col-span-2 space-y-2 pt-1 border-t border-border/50">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">
              Module Colors
            </label>
            <button
              onClick={onShuffle}
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
            >
              <Shuffle className="w-3 h-3" />
              Shuffle Pattern
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {palette.map((color, idx) => {
              const isEyeColor = color === bestContrastColor;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 p-1.5 rounded-lg border border-border bg-secondary/30"
                >
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => onUpdateColor(idx, e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => onUpdateColor(idx, e.target.value)}
                    className="h-7 px-2 rounded border border-input bg-background font-mono text-[11px] uppercase w-20"
                    maxLength={7}
                  />
                  <div className="flex-1">
                    {isEyeColor && (
                      <span
                        className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-medium cursor-help"
                        title="High-contrast color locked for finder eyes"
                      >
                        Eye
                      </span>
                    )}
                  </div>
                  {palette.length > 1 && (
                    <button
                      onClick={() => onRemoveColor(idx)}
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
  );
}
