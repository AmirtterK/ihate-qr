export type FinderShape =
  | "square"
  | "circle"
  | "leaf"
  | "chamfer"
  | "rounded"
  | "diamond"
  | "hexagon"
  | "shield"
  | "star"
  | "viewfinder"
  | "heart"
  | "teardrop"
  | "clover"
  | "gear"
  | "concentric";

export type EyePupilShape =
  | "auto"
  | "square"
  | "circle"
  | "rounded"
  | "leaf"
  | "chamfer"
  | "diamond"
  | "hexagon"
  | "shield"
  | "star"
  | "heart"
  | "cross";

export type ModuleShape =
  | "square"
  | "rounded"
  | "dots"
  | "diamond"
  | "fluid"
  | "liquid"
  | "classy"
  | "classyRounded"
  | "star"
  | "hexagon"
  | "cross"
  | "triangle"
  | "heart"
  | "flower"
  | "circuit"
  | "donut"
  | "rhombus"
  | "mosaic";

export type ColorMode = "scatter" | "gradient" | "radial";
export type LogoBacking = "rounded" | "circle" | "square" | "none";
export type CodeContainer = "default" | "rounded" | "circle" | "stamp";

export interface Preset {
  name: string;
  colors: string[];
  bg: string;
  finderShape?: FinderShape;
  eyePupilShape?: EyePupilShape;
  moduleShape?: ModuleShape;
  colorMode?: ColorMode;
  codeContainer?: CodeContainer;
}

export const PRESETS: Preset[] = [
  { name: "Standard Black", colors: ["#000000"], bg: "#FFFFFF", finderShape: "square", eyePupilShape: "square", moduleShape: "square", colorMode: "scatter" },
  { name: "Transparent Dark", colors: ["#000000"], bg: "transparent", finderShape: "square", eyePupilShape: "square", moduleShape: "square", colorMode: "scatter" },
  { name: "Cyber Circuit", colors: ["#00F0FF", "#7000FF"], bg: "#080811", finderShape: "viewfinder", eyePupilShape: "cross", moduleShape: "circuit", colorMode: "gradient" },
  { name: "Sweetheart", colors: ["#FF2E93", "#FF6584"], bg: "#FFF5F7", finderShape: "heart", eyePupilShape: "heart", moduleShape: "heart", colorMode: "gradient" },
  { name: "Botanical Garden", colors: ["#059669", "#10B981"], bg: "#F0FDF4", finderShape: "clover", eyePupilShape: "leaf", moduleShape: "flower", colorMode: "gradient" },
  { name: "GPS Navigator", colors: ["#2563EB", "#0284C7"], bg: "#F8FAFC", finderShape: "teardrop", eyePupilShape: "circle", moduleShape: "dots", colorMode: "gradient" },
  { name: "Industrial Cog", colors: ["#D97706", "#78350F"], bg: "#FFFBEB", finderShape: "gear", eyePupilShape: "hexagon", moduleShape: "rhombus", colorMode: "gradient" },
  { name: "Radar Target", colors: ["#10B981", "#064E3B"], bg: "#061A14", finderShape: "concentric", eyePupilShape: "circle", moduleShape: "donut", colorMode: "radial" },
  { name: "Crimson & Noir", colors: ["#E11D48", "#18181B"], bg: "#FFFFFF", finderShape: "square", eyePupilShape: "square", moduleShape: "square", colorMode: "scatter" },
  { name: "Cyber Neon", colors: ["#06B6D4", "#D946EF", "#3B82F6"], bg: "#09090B", finderShape: "chamfer", eyePupilShape: "chamfer", moduleShape: "fluid", colorMode: "gradient" },
  { name: "Zen Bamboo", colors: ["#16A34A", "#064E3B"], bg: "#FBF9F5", finderShape: "leaf", eyePupilShape: "leaf", moduleShape: "liquid", colorMode: "gradient" },
  { name: "Midnight Classy", colors: ["#1E293B", "#475569"], bg: "#F8FAFC", finderShape: "rounded", eyePupilShape: "rounded", moduleShape: "classy", colorMode: "gradient" },
  { name: "Cosmic Stars", colors: ["#F472B6", "#A855F7", "#6366F1"], bg: "#0F0B1A", finderShape: "star", eyePupilShape: "star", moduleShape: "star", colorMode: "radial" },
  { name: "Honeycomb Tech", colors: ["#F59E0B", "#D97706"], bg: "#1C1917", finderShape: "hexagon", eyePupilShape: "hexagon", moduleShape: "hexagon", colorMode: "gradient" },
  { name: "Heraldic Shield", colors: ["#7C3AED", "#2563EB"], bg: "#FFFFFF", finderShape: "shield", eyePupilShape: "shield", moduleShape: "classyRounded", colorMode: "gradient" },
  { name: "Aztec Mosaic", colors: ["#DC2626", "#F97316", "#FBBF24"], bg: "#FFFFFF", finderShape: "diamond", eyePupilShape: "diamond", moduleShape: "mosaic", colorMode: "scatter" },
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
