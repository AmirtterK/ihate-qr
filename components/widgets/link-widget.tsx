"use client";

import React from "react";
import { QrCode } from "lucide-react";

interface LinkWidgetProps {
  url: string;
  onUrlChange: (value: string) => void;
}

export function LinkWidget({ url, onUrlChange }: LinkWidgetProps) {
  return (
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
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="e.g. yourbrand.com or https://example.com"
          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    </div>
  );
}
