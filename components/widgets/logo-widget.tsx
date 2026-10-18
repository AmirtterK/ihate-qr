"use client";

import React from "react";
import { Layers, Upload } from "lucide-react";
import { LogoBacking } from "@/lib/qr-types";

interface LogoWidgetProps {
  logoSrc: string | null;
  logoName: string;
  logoSizePercent: number;
  logoBacking: LogoBacking;
  logoBackingColor: string;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveLogo: () => void;
  onLogoSizeChange: (size: number) => void;
  onLogoBackingChange: (backing: LogoBacking) => void;
  onLogoBackingColorChange: (color: string) => void;
}

export function LogoWidget({
  logoSrc,
  logoName,
  logoSizePercent,
  logoBacking,
  logoBackingColor,
  onLogoUpload,
  onRemoveLogo,
  onLogoSizeChange,
  onLogoBackingChange,
  onLogoBackingColorChange,
}: LogoWidgetProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm">Center Logo</h2>
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
            onChange={onLogoUpload}
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
            onClick={onRemoveLogo}
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
              <span className="text-muted-foreground">Logo Size</span>
              <span className="font-mono">{logoSizePercent}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={25}
              step={1}
              value={logoSizePercent}
              onChange={(e) => onLogoSizeChange(Number(e.target.value))}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>10%</span>
              <span>18%</span>
              <span>25%</span>
            </div>
          </div>


        </div>
      )}
    </div>
  );
}
