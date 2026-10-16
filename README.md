# ihate-qr

> Modern, scan-safe styled QR code generator built with **Next.js 14**, **React 18**, **TypeScript**, and **Tailwind CSS**.

---

## ✨ Features

- **Mixed Palette Scatter**: Randomly assigns colors from your custom multi-color palette across data modules for a unique, modern aesthetic.
- **Finder Pattern Contrast Lock**: Automatically detects the darkest color in your palette and binds it to the 3 finder corner squares to guarantee fast camera locking on iOS & Android scanners.
- **Center Logo with Auto-Clearance**: Upload any logo (PNG, JPG, SVG, WebP), scale between 10%–25%, select backing plate shape (Rounded, Circle, Square, None).
- **Standards-Compliant Engine**: Built-in zero-dependency QR engine conforming to ISO/IEC 18004 with optimal penalty mask selection and Error Correction Level H (~30% recovery).
- **High-Resolution Exports**:
  - **PNG**: 2048 x 2048px high-resolution raster export.
  - **SVG**: Clean, scalable vector graphic with grouped color paths.
  - **Clipboard**: Quick 1-click copy to system clipboard.
- **Dark & Light Mode**: Seamless theme switching with persistent state.

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
