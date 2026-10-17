"use client";

import React from "react";
import { Shuffle, Sun, Moon } from "lucide-react";

interface HeaderProps {
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onShuffle: () => void;
}

export function Header({ theme, onToggleTheme, onShuffle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105">
            <img
              src="/logo.png"
              alt="ihate-qr logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <span className="font-semibold text-base tracking-tight">ihate-qr</span>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Custom styled QR code generator
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onShuffle}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border hover:bg-secondary text-xs font-medium transition"
            title="Shuffle Mixed Palette"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Shuffle</span>
          </button>
          <button
            onClick={onToggleTheme}
            className="h-9 w-9 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition"
            title="Toggle Dark/Light Mode"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
