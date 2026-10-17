"use client";

import React from "react";
import { Download, Shuffle, Copy, Check, CheckCircle2, AlertTriangle } from "lucide-react";
import { SafetyReport } from "@/lib/qr-types";

interface PreviewWidgetProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  safetyReport: SafetyReport;
  onDownloadPng: () => void;
  onDownloadSvg: () => void;
  onShuffle: () => void;
  onCopy: () => void;
  copied: boolean;
}

export function PreviewWidget({
  canvasRef,
  safetyReport,
  onDownloadPng,
  onDownloadSvg,
  onShuffle,
  onCopy,
  copied,
}: PreviewWidgetProps) {
  return (
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
          <div className="rounded-lg overflow-hidden bg-checkerboard shadow-sm">
            <canvas ref={canvasRef} className="max-w-full h-auto block w-[320px] h-[320px]" />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-1">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onDownloadPng}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download PNG
          </button>
          <button
            onClick={onDownloadSvg}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-md border border-input bg-background hover:bg-secondary text-sm font-medium transition"
          >
            <Download className="w-4 h-4" />
            Download SVG
          </button>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <button
            onClick={onShuffle}
            className="hover:text-foreground transition flex items-center gap-1 font-medium text-foreground"
          >
            <Shuffle className="w-3.5 h-3.5" />
            Shuffle Pattern
          </button>
          <button
            onClick={onCopy}
            className="hover:text-foreground transition underline flex items-center gap-1"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
        </div>
      </div>
    </div>
  );
}
