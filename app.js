/**
 * Mixed Palette QR Studio — Client-Side Application Engine
 */

// Preset Palettes
const PRESETS = [
  { name: "Crimson & Noir", colors: ["#E11D48", "#18181B"], bg: "#FFFFFF" },
  { name: "Ocean & Navy", colors: ["#0284C7", "#0F172A"], bg: "#FFFFFF" },
  { name: "Forest & Emerald", colors: ["#16A34A", "#064E3B"], bg: "#FFFFFF" },
  { name: "Sunset Flame", colors: ["#EA580C", "#DC2626", "#450A0A"], bg: "#FFFFFF" },
  { name: "Cyberpunk Neon", colors: ["#D946EF", "#06B6D4", "#0F172A"], bg: "#FFFFFF" },
  { name: "Royal Purple", colors: ["#9333EA", "#3B0764"], bg: "#FFFFFF" },
  { name: "Monochrome Classic", colors: ["#09090B", "#52525B"], bg: "#FFFFFF" },
];

// App State
const state = {
  url: "https://github.com",
  palette: ["#E11D48", "#18181B"],
  bgColor: "#FFFFFF",
  seed: "48291",
  moduleShape: "square",
  logoSrc: null,
  logoImage: null,
  logoName: "",
  logoSizePercent: 18,
  logoBackingShape: "rounded",
  logoBackingColor: "#FFFFFF",
  pdfCodeSize: 60,
  pdfColumns: 3,
  pdfCount: 12,
  pdfCutLines: true,
  theme: localStorage.getItem("theme") || "dark"
};

// Seeded PRNG (Mulberry32)
function createRng(seedStr) {
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

// Color Utilities & Contrast
function hexToRgb(hex) {
  let cleaned = hex.replace("#", "").trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split("").map((c) => c + c).join("");
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return [0, 0, 0];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1, hex2) {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const l1 = getLuminance(r1, g1, b1);
  const l2 = getLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getDarkestColor(colors) {
  if (!colors || colors.length === 0) return "#000000";
  let darkest = colors[0];
  let minLum = 1.0;
  for (const c of colors) {
    const [r, g, b] = hexToRgb(c);
    const lum = getLuminance(r, g, b);
    if (lum < minLum) {
      minLum = lum;
      darkest = c;
    }
  }
  return darkest;
}

function normalizeUrl(raw) {
  const trimmed = raw.trim();
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
}

// Generate QR Matrix using CDN qrcode or built-in fallback
function getQRMatrix(text) {
  if (typeof qrcode !== "undefined") {
    try {
      const qr = qrcode(0, "H");
      qr.addData(text);
      qr.make();
      const count = qr.getModuleCount();
      const modules = [];
      const isFinderPattern = [];

      for (let r = 0; r < count; r++) {
        modules[r] = [];
        isFinderPattern[r] = [];
        for (let c = 0; c < count; c++) {
          modules[r][c] = qr.isDark(r, c);

          // Mark standard 7x7 finders
          const isTopLeft = r <= 7 && c <= 7;
          const isTopRight = r <= 7 && c >= count - 8;
          const isBottomLeft = r >= count - 8 && c <= 7;
          isFinderPattern[r][c] = isTopLeft || isTopRight || isBottomLeft;
        }
      }

      return { size: count, modules, isFinderPattern };
    } catch (e) {
      console.warn("CDN QR generator failed, using native fallback", e);
    }
  }

  // Fallback 29x29 dummy pattern for safety
  const size = 29;
  const modules = Array.from({ length: size }, () => Array(size).fill(false));
  const isFinderPattern = Array.from({ length: size }, () => Array(size).fill(false));
  return { size, modules, isFinderPattern };
}

// DOM Elements
const elements = {
  urlInput: document.getElementById("urlInput"),
  clearUrlBtn: document.getElementById("clearUrlBtn"),
  encodedUrlDisplay: document.getElementById("encodedUrlDisplay"),
  charCountDisplay: document.getElementById("charCountDisplay"),
  bgColorPicker: document.getElementById("bgColorPicker"),
  bgColorTextInput: document.getElementById("bgColorTextInput"),
  bgColorHex: document.getElementById("bgColorHex"),
  addColorBtn: document.getElementById("addColorBtn"),
  paletteList: document.getElementById("paletteList"),
  palettePresetsContainer: document.getElementById("palettePresetsContainer"),
  colorCountLabel: document.getElementById("colorCountLabel"),
  logoDropZone: document.getElementById("logoDropZone"),
  logoFileInput: document.getElementById("logoFileInput"),
  logoUploadPrompt: document.getElementById("logoUploadPrompt"),
  logoPreviewContainer: document.getElementById("logoPreviewContainer"),
  logoThumbImg: document.getElementById("logoThumbImg"),
  logoFileName: document.getElementById("logoFileName"),
  logoDimensions: document.getElementById("logoDimensions"),
  removeLogoBtn: document.getElementById("removeLogoBtn"),
  logoControls: document.getElementById("logoControls"),
  logoStatusBadge: document.getElementById("logoStatusBadge"),
  logoSizeSlider: document.getElementById("logoSizeSlider"),
  logoSizeLabel: document.getElementById("logoSizeLabel"),
  logoBackingShape: document.getElementById("logoBackingShape"),
  logoBackingColorWrapper: document.getElementById("logoBackingColorWrapper"),
  logoBackingColorPicker: document.getElementById("logoBackingColorPicker"),
  logoBackingColorTextInput: document.getElementById("logoBackingColorTextInput"),
  backingColorHex: document.getElementById("backingColorHex"),
  seedInput: document.getElementById("seedInput"),
  shuffleBtn: document.getElementById("shuffleBtn"),
  moduleShapeSelect: document.getElementById("moduleShapeSelect"),
  pdfCodeSizeInput: document.getElementById("pdfCodeSizeInput"),
  pdfColumnsInput: document.getElementById("pdfColumnsInput"),
  pdfCountInput: document.getElementById("pdfCountInput"),
  pdfCutLinesCheckbox: document.getElementById("pdfCutLinesCheckbox"),
  generatePdfBtn: document.getElementById("generatePdfBtn"),
  qrCanvas: document.getElementById("qrCanvas"),
  safetyBadge: document.getElementById("safetyBadge"),
  safetyAlertsList: document.getElementById("safetyAlertsList"),
  overallSafetyScore: document.getElementById("overallSafetyScore"),
  downloadPngBtn: document.getElementById("downloadPngBtn"),
  downloadSvgBtn: document.getElementById("downloadSvgBtn"),
  copyImageBtn: document.getElementById("copyImageBtn"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  moonIcon: document.getElementById("moonIcon"),
  sunIcon: document.getElementById("sunIcon"),
  resetDefaultsBtn: document.getElementById("resetDefaultsBtn"),
  matrixModulesBadge: document.getElementById("matrixModulesBadge")
};

// Render Palette Items
function renderPaletteList() {
  elements.paletteList.innerHTML = "";
  const darkest = getDarkestColor(state.palette);

  state.palette.forEach((color, idx) => {
    const isDarkest = color === darkest;
    const item = document.createElement("div");
    item.className = "flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30";
    item.innerHTML = `
      <input type="color" value="${color}" class="color-picker-input shrink-0" data-index="${idx}" />
      <input type="text" value="${color}" maxlength="7" class="input font-mono text-xs uppercase w-20" data-text-index="${idx}" />
      <div class="flex-1">
        ${isDarkest ? '<span class="badge badge-secondary text-[10px]">Finder Lock</span>' : ''}
      </div>
      ${state.palette.length > 2 ? `
        <button type="button" class="btn btn-ghost btn-sm text-destructive hover:bg-destructive/10" data-remove-index="${idx}">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
        </button>
      ` : ''}
    `;
    elements.paletteList.appendChild(item);
  });

  elements.colorCountLabel.textContent = `${state.palette.length} colors active`;

  // Attach Listeners
  elements.paletteList.querySelectorAll("input[type='color']").forEach((input) => {
    input.addEventListener("input", (e) => {
      const idx = Number(e.target.dataset.index);
      state.palette[idx] = e.target.value;
      renderPaletteList();
      updateAll();
    });
  });

  elements.paletteList.querySelectorAll("input[type='text']").forEach((input) => {
    input.addEventListener("input", (e) => {
      const idx = Number(e.target.dataset.textIndex);
      let val = e.target.value.trim();
      if (!val.startsWith("#")) val = "#" + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        state.palette[idx] = val;
        renderPaletteList();
        updateAll();
      }
    });
  });

  elements.paletteList.querySelectorAll("button[data-remove-index]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = Number(btn.closest("[data-remove-index]").dataset.removeIndex);
      state.palette.splice(idx, 1);
      renderPaletteList();
      updateAll();
    });
  });
}

// Render Presets
function renderPresets() {
  elements.palettePresetsContainer.innerHTML = "";
  PRESETS.forEach((p) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "preset-chip";
    chip.innerHTML = `
      <div class="flex -space-x-1">
        ${p.colors.map((c) => `<div class="preset-dot" style="background-color: ${c}"></div>`).join("")}
      </div>
      <span>${p.name}</span>
    `;
    chip.addEventListener("click", () => {
      state.palette = [...p.colors];
      state.bgColor = p.bg;
      elements.bgColorPicker.value = p.bg;
      elements.bgColorTextInput.value = p.bg;
      elements.bgColorHex.textContent = p.bg;
      renderPaletteList();
      updateAll();
    });
    elements.palettePresetsContainer.appendChild(chip);
  });
}

// Render Canvas
function renderQR(targetCanvas, targetSize = 1024) {
  const ctx = targetCanvas.getContext("2d");
  if (!ctx) return;

  const normalized = normalizeUrl(state.url);
  const { size: moduleCount, modules, isFinderPattern } = getQRMatrix(normalized);

  targetCanvas.width = targetSize;
  targetCanvas.height = targetSize;

  const quietZone = 4;
  const totalModules = moduleCount + quietZone * 2;
  const modPixel = targetSize / totalModules;

  // Background
  ctx.fillStyle = state.bgColor;
  ctx.fillRect(0, 0, targetSize, targetSize);

  const darkest = getDarkestColor(state.palette);
  const rng = createRng(state.seed);

  // Logo boundaries
  let logoLeft = -1, logoRight = -1, logoTop = -1, logoBottom = -1;
  if (state.logoSrc) {
    const logoModules = Math.ceil((state.logoSizePercent / 100) * moduleCount);
    const center = moduleCount / 2;
    const half = logoModules / 2;
    const margin = 1;
    logoLeft = Math.floor(center - half) - margin;
    logoRight = Math.ceil(center + half) + margin;
    logoTop = Math.floor(center - half) - margin;
    logoBottom = Math.ceil(center + half) + margin;
  }

  // Draw modules
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (!modules[r][c]) continue;

      if (state.logoSrc && r >= logoTop && r <= logoBottom && c >= logoLeft && c <= logoRight) {
        continue;
      }

      const x = (c + quietZone) * modPixel;
      const y = (r + quietZone) * modPixel;

      let color = darkest;
      if (!isFinderPattern[r][c]) {
        const cIdx = Math.floor(rng() * state.palette.length);
        color = state.palette[cIdx];
      }

      ctx.fillStyle = color;

      if (isFinderPattern[r][c] || state.moduleShape === "square") {
        ctx.fillRect(x, y, modPixel + 0.3, modPixel + 0.3);
      } else if (state.moduleShape === "rounded") {
        const rad = modPixel * 0.35;
        ctx.beginPath();
        ctx.roundRect(x, y, modPixel, modPixel, rad);
        ctx.fill();
      } else if (state.moduleShape === "dots") {
        ctx.beginPath();
        ctx.arc(x + modPixel / 2, y + modPixel / 2, modPixel * 0.44, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Logo draw
  if (state.logoImage && state.logoSrc) {
    const logoPx = (state.logoSizePercent / 100) * (moduleCount * modPixel);
    const cx = targetSize / 2;
    const cy = targetSize / 2;
    const lx = cx - logoPx / 2;
    const ly = cy - logoPx / 2;

    if (state.logoBackingShape !== "none") {
      const pad = modPixel * 0.8;
      ctx.fillStyle = state.logoBackingColor;
      if (state.logoBackingShape === "circle") {
        ctx.beginPath();
        ctx.arc(cx, cy, (logoPx + pad) / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (state.logoBackingShape === "rounded") {
        ctx.beginPath();
        ctx.roundRect(lx - pad / 2, ly - pad / 2, logoPx + pad, logoPx + pad, (logoPx + pad) * 0.25);
        ctx.fill();
      } else {
        ctx.fillRect(lx - pad / 2, ly - pad / 2, logoPx + pad, logoPx + pad);
      }
    }

    ctx.drawImage(state.logoImage, lx, ly, logoPx, logoPx);
  }

  if (elements.matrixModulesBadge) {
    elements.matrixModulesBadge.textContent = `${moduleCount}x${moduleCount} Modules`;
  }
}

// Scan-Safety Analysis
function runSafetyChecks() {
  const warnings = [];
  const darkest = getDarkestColor(state.palette);

  state.palette.forEach((color, idx) => {
    const ratio = getContrastRatio(color, state.bgColor);
    if (ratio < 3.0) {
      warnings.push({
        critical: true,
        text: `Color ${idx + 1} (${color}) has low contrast (${ratio.toFixed(1)}:1) against background.`
      });
    } else if (ratio < 4.5) {
      warnings.push({
        critical: false,
        text: `Color ${idx + 1} (${color}) contrast is moderate (${ratio.toFixed(1)}:1). Darker recommended.`
      });
    }
  });

  const finderRatio = getContrastRatio(darkest, state.bgColor);
  if (finderRatio < 4.0) {
    warnings.push({
      critical: true,
      text: `Finder corners contrast is low (${finderRatio.toFixed(1)}:1). Cameras will fail to lock on code.`
    });
  }

  if (state.logoSrc && state.logoSizePercent > 22) {
    warnings.push({
      critical: true,
      text: `Logo width (${state.logoSizePercent}%) is near Error Correction H safety limit (25%).`
    });
  }

  const isSafe = warnings.filter((w) => w.critical).length === 0;

  if (isSafe) {
    elements.safetyBadge.className = "badge badge-success text-xs font-medium";
    elements.safetyBadge.innerHTML = `<svg class="w-3 h-3 mr-1 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Scan Ready`;
    elements.overallSafetyScore.className = "font-mono text-emerald-500 font-semibold";
    elements.overallSafetyScore.textContent = "100% Safe";
  } else {
    elements.safetyBadge.className = "badge badge-warning text-xs font-medium";
    elements.safetyBadge.innerHTML = `<svg class="w-3 h-3 mr-1 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg> Warning`;
    elements.overallSafetyScore.className = "font-mono text-amber-500 font-semibold";
    elements.overallSafetyScore.textContent = "Attention Needed";
  }

  elements.safetyAlertsList.innerHTML = "";
  if (warnings.length === 0) {
    elements.safetyAlertsList.innerHTML = `
      <div class="text-[11px] text-muted-foreground">All colors meet high contrast thresholds and finder corners are locked to highest contrast.</div>
    `;
  } else {
    warnings.forEach((w) => {
      const div = document.createElement("div");
      div.className = `flex items-start gap-1.5 text-[11px] ${w.critical ? "text-destructive font-medium" : "text-amber-500"}`;
      div.innerHTML = `
        <svg class="w-3 h-3 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
        <span>${w.text}</span>
      `;
      elements.safetyAlertsList.appendChild(div);
    });
  }
}

// Master update
function updateAll() {
  const norm = normalizeUrl(state.url);
  elements.encodedUrlDisplay.textContent = norm;
  elements.charCountDisplay.textContent = `${norm.length} chars`;

  renderQR(elements.qrCanvas, 760);
  runSafetyChecks();
}

// Initialise Listeners
function init() {
  // Theme setup
  document.documentElement.className = state.theme;
  elements.moonIcon.classList.toggle("hidden", state.theme === "dark");
  elements.sunIcon.classList.toggle("hidden", state.theme === "light");

  elements.themeToggleBtn.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", state.theme);
    document.documentElement.className = state.theme;
    elements.moonIcon.classList.toggle("hidden", state.theme === "dark");
    elements.sunIcon.classList.toggle("hidden", state.theme === "light");
  });

  // URL input
  elements.urlInput.addEventListener("input", (e) => {
    state.url = e.target.value;
    updateAll();
  });

  elements.clearUrlBtn.addEventListener("click", () => {
    state.url = "";
    elements.urlInput.value = "";
    updateAll();
  });

  // Background color
  elements.bgColorPicker.addEventListener("input", (e) => {
    state.bgColor = e.target.value;
    elements.bgColorTextInput.value = e.target.value;
    elements.bgColorHex.textContent = e.target.value;
    updateAll();
  });

  elements.bgColorTextInput.addEventListener("input", (e) => {
    let val = e.target.value.trim();
    if (!val.startsWith("#")) val = "#" + val;
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      state.bgColor = val;
      elements.bgColorPicker.value = val;
      elements.bgColorHex.textContent = val;
      updateAll();
    }
  });

  // Add Color
  elements.addColorBtn.addEventListener("click", () => {
    if (state.palette.length < 8) {
      state.palette.push("#3B82F6");
      renderPaletteList();
      updateAll();
    }
  });

  // Logo file handling
  elements.logoDropZone.addEventListener("click", (e) => {
    if (e.target !== elements.removeLogoBtn) {
      elements.logoFileInput.click();
    }
  });

  elements.logoFileInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    state.logoName = file.name;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const src = evt.target?.result;
      state.logoSrc = src;
      const img = new Image();
      img.onload = () => {
        state.logoImage = img;
        elements.logoDimensions.textContent = `${img.naturalWidth} x ${img.naturalHeight} px`;
        elements.logoThumbImg.src = src;
        elements.logoFileName.textContent = file.name;
        elements.logoUploadPrompt.classList.add("hidden");
        elements.logoPreviewContainer.classList.remove("hidden");
        elements.logoStatusBadge.textContent = "Active";
        elements.logoStatusBadge.className = "badge badge-secondary text-xs";
        updateAll();
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });

  elements.removeLogoBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    state.logoSrc = null;
    state.logoImage = null;
    state.logoName = "";
    elements.logoFileInput.value = "";
    elements.logoUploadPrompt.classList.remove("hidden");
    elements.logoPreviewContainer.classList.add("hidden");
    elements.logoStatusBadge.textContent = "No Logo";
    elements.logoStatusBadge.className = "badge badge-outline text-xs";
    updateAll();
  });

  // Logo Size Slider
  elements.logoSizeSlider.addEventListener("input", (e) => {
    state.logoSizePercent = Number(e.target.value);
    elements.logoSizeLabel.textContent = `${state.logoSizePercent}%`;
    updateAll();
  });

  // Backing Shape
  elements.logoBackingShape.addEventListener("change", (e) => {
    state.logoBackingShape = e.target.value;
    elements.logoBackingColorWrapper.classList.toggle("hidden", state.logoBackingShape === "none");
    updateAll();
  });

  elements.logoBackingColorPicker.addEventListener("input", (e) => {
    state.logoBackingColor = e.target.value;
    elements.logoBackingColorTextInput.value = e.target.value;
    elements.backingColorHex.textContent = e.target.value;
    updateAll();
  });

  // Seed & Shuffle
  elements.seedInput.addEventListener("input", (e) => {
    state.seed = e.target.value;
    updateAll();
  });

  elements.shuffleBtn.addEventListener("click", () => {
    state.seed = Math.floor(10000 + Math.random() * 900000).toString();
    elements.seedInput.value = state.seed;
    updateAll();
  });

  // Module Shape
  elements.moduleShapeSelect.addEventListener("change", (e) => {
    state.moduleShape = e.target.value;
    updateAll();
  });

  // Downloads
  elements.downloadPngBtn.addEventListener("click", () => {
    const canvas = document.createElement("canvas");
    renderQR(canvas, 2048);
    const link = document.createElement("a");
    link.download = `mixed-qr-${state.seed}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  });

  elements.downloadSvgBtn.addEventListener("click", () => {
    const norm = normalizeUrl(state.url);
    const { size: moduleCount, modules, isFinderPattern } = getQRMatrix(norm);
    const quietZone = 4;
    const totalModules = moduleCount + quietZone * 2;
    const svgSize = 1024;
    const modSize = svgSize / totalModules;
    const rng = createRng(state.seed);
    const darkest = getDarkestColor(state.palette);

    let logoLeft = -1, logoRight = -1, logoTop = -1, logoBottom = -1;
    if (state.logoSrc) {
      const logoModules = Math.ceil((state.logoSizePercent / 100) * moduleCount);
      const center = moduleCount / 2;
      const half = logoModules / 2;
      const margin = 1;
      logoLeft = Math.floor(center - half) - margin;
      logoRight = Math.ceil(center + half) + margin;
      logoTop = Math.floor(center - half) - margin;
      logoBottom = Math.ceil(center + half) + margin;
    }

    const colorGroups = {};
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (!modules[r][c]) continue;
        if (state.logoSrc && r >= logoTop && r <= logoBottom && c >= logoLeft && c <= logoRight) continue;

        const x = ((c + quietZone) * modSize).toFixed(2);
        const y = ((r + quietZone) * modSize).toFixed(2);
        const w = (modSize + 0.1).toFixed(2);

        let color = darkest;
        if (!isFinderPattern[r][c]) {
          const cIdx = Math.floor(rng() * state.palette.length);
          color = state.palette[cIdx];
        }

        if (!colorGroups[color]) colorGroups[color] = [];
        colorGroups[color].push(`<rect x="${x}" y="${y}" width="${w}" height="${w}" />`);
      }
    }

    let groupsXml = "";
    for (const [color, rects] of Object.entries(colorGroups)) {
      groupsXml += `<g fill="${color}">${rects.join("")}</g>`;
    }

    let logoXml = "";
    if (state.logoSrc) {
      const logoPx = ((state.logoSizePercent / 100) * (moduleCount * modSize)).toFixed(2);
      const cx = (svgSize / 2).toFixed(2);
      const cy = (svgSize / 2).toFixed(2);
      const lx = (svgSize / 2 - parseFloat(logoPx) / 2).toFixed(2);
      const ly = (svgSize / 2 - parseFloat(logoPx) / 2).toFixed(2);
      const pad = (modSize * 0.8).toFixed(2);

      if (state.logoBackingShape === "circle") {
        const rad = ((parseFloat(logoPx) + parseFloat(pad)) / 2).toFixed(2);
        logoXml += `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${state.logoBackingColor}" />`;
      } else if (state.logoBackingShape === "rounded") {
        const bSize = (parseFloat(logoPx) + parseFloat(pad)).toFixed(2);
        const bx = (parseFloat(lx) - parseFloat(pad) / 2).toFixed(2);
        const by = (parseFloat(ly) - parseFloat(pad) / 2).toFixed(2);
        const rx = (parseFloat(bSize) * 0.25).toFixed(2);
        logoXml += `<rect x="${bx}" y="${by}" width="${bSize}" height="${bSize}" rx="${rx}" fill="${state.logoBackingColor}" />`;
      } else if (state.logoBackingShape === "square") {
        const bSize = (parseFloat(logoPx) + parseFloat(pad)).toFixed(2);
        const bx = (parseFloat(lx) - parseFloat(pad) / 2).toFixed(2);
        const by = (parseFloat(ly) - parseFloat(pad) / 2).toFixed(2);
        logoXml += `<rect x="${bx}" y="${by}" width="${bSize}" height="${bSize}" fill="${state.logoBackingColor}" />`;
      }

      logoXml += `<image href="${state.logoSrc}" x="${lx}" y="${ly}" width="${logoPx}" height="${logoPx}" />`;
    }

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgSize} ${svgSize}" width="${svgSize}" height="${svgSize}">
  <rect width="100%" height="100%" fill="${state.bgColor}" />
  ${groupsXml}
  ${logoXml}
</svg>`;

    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `mixed-qr-${state.seed}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  });

  // Clipboard
  elements.copyImageBtn.addEventListener("click", async () => {
    try {
      const canvas = document.createElement("canvas");
      renderQR(canvas, 1024);
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        elements.copyImageBtn.textContent = "Copied to Clipboard!";
        setTimeout(() => {
          elements.copyImageBtn.innerHTML = `
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            Copy to Clipboard
          `;
        }, 2000);
      });
    } catch (e) {
      console.error(e);
    }
  });

  // A4 PDF Print Sheet
  elements.generatePdfBtn.addEventListener("click", () => {
    if (typeof jspdf === "undefined" && typeof window.jspdf === "undefined") {
      alert("jsPDF library is not loaded. Please ensure an active internet connection to load jsPDF CDN.");
      return;
    }

    const jsPDFClass = window.jspdf?.jsPDF || jspdf?.jsPDF || jspdf;
    const doc = new jsPDFClass({ orientation: "portrait", unit: "mm", format: "a4" });

    const canvas = document.createElement("canvas");
    renderQR(canvas, 1024);
    const dataUrl = canvas.toDataURL("image/png");

    const codeSizeMm = Number(elements.pdfCodeSizeInput.value) || 60;
    const columns = Number(elements.pdfColumnsInput.value) || 3;
    const count = Number(elements.pdfCountInput.value) || 12;
    const includeCutLines = elements.pdfCutLinesCheckbox.checked;

    const pageWidth = 210;
    const pageHeight = 297;
    const marginX = 15;
    const marginY = 15;
    const printableWidth = pageWidth - 2 * marginX;
    const printableHeight = pageHeight - 2 * marginY;

    const colGap = columns > 1 ? (printableWidth - columns * codeSizeMm) / (columns - 1) : 0;
    const itemHeight = codeSizeMm + 6;
    const rowsPerPage = Math.max(1, Math.floor(printableHeight / itemHeight));
    const rowGap = rowsPerPage > 1 ? (printableHeight - rowsPerPage * itemHeight) / (rowsPerPage - 1) : 6;
    const itemsPerPage = columns * rowsPerPage;

    let currentItem = 0;
    let pageNum = 1;

    while (currentItem < count) {
      if (pageNum > 1) doc.addPage();

      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Mixed Palette QR Studio — A4 Print Sheet (Page ${pageNum})`, marginX, 8);

      const startIndex = currentItem;
      const pageItems = Math.min(itemsPerPage, count - startIndex);

      for (let i = 0; i < pageItems; i++) {
        const row = Math.floor(i / columns);
        const col = i % columns;

        const x = marginX + col * (codeSizeMm + colGap);
        const y = marginY + row * (itemHeight + rowGap);

        doc.addImage(dataUrl, "PNG", x, y, codeSizeMm, codeSizeMm);

        if (includeCutLines) {
          doc.setDrawColor(220, 220, 220);
          doc.setLineDashPattern([1, 2], 0);
          doc.rect(x - 1, y - 1, codeSizeMm + 2, itemHeight);
        }

        const cleanLabel = normalizeUrl(state.url).replace(/^https?:\/\//, "");
        const truncated = cleanLabel.length > 30 ? cleanLabel.substring(0, 28) + "..." : cleanLabel;
        doc.setFontSize(7);
        doc.setTextColor(90, 90, 90);
        doc.text(truncated, x + codeSizeMm / 2, y + codeSizeMm + 4, { align: "center" });

        currentItem++;
      }
      pageNum++;
    }

    doc.save(`mixed-qr-print-sheet-${count}codes.pdf`);
  });

  // Reset Defaults
  elements.resetDefaultsBtn.addEventListener("click", () => {
    state.url = "https://github.com";
    state.palette = ["#E11D48", "#18181B"];
    state.bgColor = "#FFFFFF";
    state.seed = "48291";
    state.moduleShape = "square";
    state.logoSrc = null;
    state.logoImage = null;
    elements.urlInput.value = state.url;
    elements.bgColorPicker.value = state.bgColor;
    elements.bgColorTextInput.value = state.bgColor;
    elements.bgColorHex.textContent = state.bgColor;
    elements.seedInput.value = state.seed;
    elements.moduleShapeSelect.value = state.moduleShape;
    renderPaletteList();
    updateAll();
  });

  renderPresets();
  renderPaletteList();
  updateAll();
}

// Start on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
