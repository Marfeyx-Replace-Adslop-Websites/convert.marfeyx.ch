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

Open `http://127.0.0.1:5500` after `npm run dev`. The source `index.html` requires
Vite and should not be opened directly as a file.

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

## Interface

The interface uses HeroUI 3 for its controls, cards, select menus, progress,
tooltips, format-guide modal, tabs, and accordion. Four adapted 21st.dev / Magic UI
components supply subtle entrance, border, pattern, and pointer effects. All motion
respects reduced-motion preferences. Fonts are self-hosted; no analytics or auth
services were added. See `THIRD_PARTY_NOTICES.md` for component sources and licenses.

The original conversion engine in `src/converter.ts` is unchanged. The page keeps
the single-file workflow, now with drag-and-drop and disabled controls while busy.
Changing a file or output format clears the previous result. No conversion history
or file data is persisted.

## Verification

Run `npm run build` then `npm test`. The Playwright suite uses installed Google
Chrome by default. To use Playwright Chromium instead, install it with
`npx playwright install chromium` and set `PLAYWRIGHT_CHANNEL=chromium`.

Tests verify actual image, data, text, and ZIP output contents; download names;
invalid input recovery; drag-and-drop; the format guide; and responsive layouts.
The media regression test checks loading/disabled controls and a failed CDN request
without downloading the large media engine. It does not claim every media codec
is supported by every browser. Test screenshots are saved under `test-results/`.
