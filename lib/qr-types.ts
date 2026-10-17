export type FinderShape = "square" | "circle" | "leaf" | "chamfer";
export type ModuleShape = "square" | "rounded" | "dots" | "diamond" | "fluid" | "liquid";
export type ColorMode = "scatter" | "gradient" | "radial";
export type LogoBacking = "rounded" | "circle" | "square" | "none";

export interface Preset {
  name: string;
  colors: string[];
  bg: string;
  finderShape?: FinderShape;
  moduleShape?: ModuleShape;
  colorMode?: ColorMode;
}

export const PRESETS: Preset[] = [
  { name: "Crimson & Noir", colors: ["#E11D48", "#18181B"], bg: "#FFFFFF", finderShape: "square", moduleShape: "square", colorMode: "scatter" },
  { name: "Cyber Neon", colors: ["#06B6D4", "#D946EF", "#3B82F6"], bg: "#09090B", finderShape: "chamfer", moduleShape: "fluid", colorMode: "gradient" },
  { name: "Zen Bamboo", colors: ["#16A34A", "#064E3B"], bg: "#FBF9F5", finderShape: "leaf", moduleShape: "liquid", colorMode: "gradient" },
  { name: "Sunset Gold", colors: ["#F59E0B", "#EA580C", "#991B1B"], bg: "#FFFFFF", finderShape: "circle", moduleShape: "diamond", colorMode: "radial" },
  { name: "Ocean Breeze", colors: ["#0284C7", "#0F172A"], bg: "#FFFFFF", finderShape: "circle", moduleShape: "liquid", colorMode: "gradient" },
  { name: "Royal Purple", colors: ["#9333EA", "#3B0764"], bg: "#FFFFFF", finderShape: "leaf", moduleShape: "dots", colorMode: "gradient" },
  { name: "Monochrome Classic", colors: ["#09090B", "#52525B"], bg: "#FFFFFF", finderShape: "square", moduleShape: "square", colorMode: "scatter" },
];

export interface SafetyWarning {
  type: "contrast" | "logo";
  message: string;
  critical: boolean;
}

export interface SafetyReport {
  isSafe: boolean;
  warnings: SafetyWarning[];
}
