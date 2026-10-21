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
  { name: "Standard Black", colors: ["#000000"], bg: "#FFFFFF", finderShape: "square", eyePupilShape: "square", moduleShape: "square", colorMode: "scatter", codeContainer: "default" },
  { name: "Cyber Circuit", colors: ["#00F0FF", "#7000FF"], bg: "#080811", finderShape: "viewfinder", eyePupilShape: "cross", moduleShape: "circuit", colorMode: "gradient", codeContainer: "default" },
  { name: "Sweetheart", colors: ["#E11D48", "#9F1239"], bg: "#FFF5F7", finderShape: "heart", eyePupilShape: "heart", moduleShape: "heart", colorMode: "gradient", codeContainer: "default" },
  { name: "Botanical Garden", colors: ["#059669", "#10B981"], bg: "#F0FDF4", finderShape: "clover", eyePupilShape: "leaf", moduleShape: "flower", colorMode: "gradient", codeContainer: "default" },
  { name: "GPS Navigator", colors: ["#2563EB", "#0284C7"], bg: "#F8FAFC", finderShape: "teardrop", eyePupilShape: "circle", moduleShape: "dots", colorMode: "gradient", codeContainer: "default" },
  { name: "Industrial Cog", colors: ["#D97706", "#78350F"], bg: "#FFFBEB", finderShape: "gear", eyePupilShape: "hexagon", moduleShape: "rhombus", colorMode: "gradient", codeContainer: "default" },
  { name: "Radar Target", colors: ["#10B981", "#064E3B"], bg: "#061A14", finderShape: "concentric", eyePupilShape: "circle", moduleShape: "donut", colorMode: "radial", codeContainer: "default" },
  { name: "Crimson & Noir", colors: ["#E11D48", "#18181B"], bg: "#FFFFFF", finderShape: "square", eyePupilShape: "square", moduleShape: "square", colorMode: "scatter", codeContainer: "default" },
  { name: "Cyber Neon", colors: ["#06B6D4", "#D946EF", "#3B82F6"], bg: "#09090B", finderShape: "chamfer", eyePupilShape: "chamfer", moduleShape: "fluid", colorMode: "gradient", codeContainer: "default" },
  { name: "Zen Bamboo", colors: ["#16A34A", "#064E3B"], bg: "#FBF9F5", finderShape: "leaf", eyePupilShape: "leaf", moduleShape: "liquid", colorMode: "gradient", codeContainer: "default" },
  { name: "Midnight Classy", colors: ["#1E293B", "#475569"], bg: "#F8FAFC", finderShape: "rounded", eyePupilShape: "rounded", moduleShape: "classy", colorMode: "gradient", codeContainer: "default" },
  { name: "Cosmic Stars", colors: ["#F472B6", "#A855F7", "#6366F1"], bg: "#0F0B1A", finderShape: "star", eyePupilShape: "star", moduleShape: "star", colorMode: "radial", codeContainer: "default" },
  { name: "Honeycomb Tech", colors: ["#F59E0B", "#D97706"], bg: "#1C1917", finderShape: "hexagon", eyePupilShape: "hexagon", moduleShape: "hexagon", colorMode: "gradient", codeContainer: "default" },
  { name: "Heraldic Shield", colors: ["#7C3AED", "#2563EB"], bg: "#FFFFFF", finderShape: "shield", eyePupilShape: "shield", moduleShape: "classyRounded", colorMode: "gradient", codeContainer: "default" },
  { name: "Aztec Mosaic", colors: ["#DC2626", "#F97316", "#FBBF24"], bg: "#FFFFFF", finderShape: "diamond", eyePupilShape: "diamond", moduleShape: "mosaic", colorMode: "scatter", codeContainer: "default" },
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
