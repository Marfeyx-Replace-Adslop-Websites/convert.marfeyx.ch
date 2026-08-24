# All Types File Converter

A GitHub Pages-compatible React app for local browser file conversion.

Files are processed in the browser without login or external auth services.

## Environment

No Vite environment variables are required.

## Commands

```powershell
npm install
npm run dev
npm run build
```

## GitHub Pages

This repo includes `.github/workflows/pages.yml` for automatic GitHub Pages deployment from the `main` branch.
The workflow builds the Vite app and deploys only `dist`, so GitHub Pages serves the compiled static files instead of the source tree.

Enable Pages with source set to **GitHub Actions** in the repository settings.

The Vite config uses relative asset paths (`base: "./"`), and `public/.nojekyll` is copied into `dist` so Pages does not run Jekyll processing on built assets.

## Supported areas

- Images: PNG, JPEG, WebP through browser canvas.
- Media: MP4, WebM, MP3, WAV, Ogg through FFmpeg.wasm when supported by the browser.
- Data: JSON formatting, JSON to CSV, CSV to JSON.
- Text: plain text and simple HTML output.
- ZIP: package one file or extract a ZIP into a new local ZIP bundle.
