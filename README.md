# Mixed Palette QR Studio

> Modern, scan-safe styled QR code studio built with **Next.js 14**, **React 18**, **TypeScript**, **Tailwind CSS**, and **Shadcn UI**. Also includes a zero-build static bundle ready for immediate browser usage or GitHub Pages.

![Mixed Palette QR Studio Preview](https://raw.githubusercontent.com/AmirtterK/awsome-qr/main/preview.png)

---

## ✨ Features

- **Mixed Palette Scatter**: Randomly assigns colors from your custom multi-color palette across data modules for a unique, modern aesthetic.
- **Finder Pattern Contrast Lock**: Automatically detects the darkest color in your palette and binds it to the 3 finder corner squares to guarantee fast camera locking on iOS & Android scanners.
- **Seeded Reproducibility**: Includes a deterministic PRNG seed input and a 1-click **Shuffle** button so any aesthetic configuration can be reproduced.
- **Center Logo with Auto-Clearance**: Upload any logo (PNG, JPG, SVG, WebP), scale between 10%–25%, select backing plate shape (Rounded, Circle, Square, None), with quiet margin module clearing under Error Correction Level H (~30% recovery).
- **Real-Time Scan-Safety Diagnostics**:
  - Calculates relative luminance and WCAG contrast ratios against the background.
  - Warns in real-time if contrast is insufficient (< 3.0:1) or if logo size exceeds data density safety thresholds.
- **High-Resolution Exports**:
  - **PNG**: 2048 x 2048px high-resolution raster export.
  - **SVG**: Clean, scalable vector graphic with grouped color paths.
  - **Clipboard**: Quick 1-click copy to system clipboard.
- **A4 Print Sheet Generator**:
  - Client-side PDF generation formatted for standard A4 paper (210 x 297 mm).
  - Configurable code size in mm (default: 60mm), column count (default: 3), and total codes (default: 12).
  - Includes subtle cut guidelines and URL labels.
- **Dark & Light Mode**: Seamless theme switching with persistent state and zinc/slate shadcn design tokens.

---

## 🚀 Running the Project

### Option A: Next.js + React (App Router)

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Option B: Standalone Static Mode (No build / Zero dependencies)

Open `index.html` directly in any web browser, or serve with any static web server:

```bash
npx serve .
# or python -m http.server 8000
```

---

## 📦 Push to GitHub

To push this repository to GitHub using GitHub CLI (`gh`):

```bash
git init
git add .
git commit -m "feat: complete mixed palette QR studio with Next.js and shadcn ui"
gh repo create awsome-qr --public --source=. --remote=origin --push
```

Or with standard git:

```bash
git remote add origin https://github.com/AmirtterK/awsome-qr.git
git branch -M main
git push -u origin main
```
