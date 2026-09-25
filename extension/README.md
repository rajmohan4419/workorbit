# OrbitBoard Chrome Extension

Companion Chrome Extension (Manifest V3) for [OrbitBoard](https://orbitboard.in) — practical online tools for developers, finance, work, and everyday tasks.

---

## Features

- **Instant Tool Directory & Search**: Real-time filtering across all 53+ OrbitBoard tools with category pills and keyboard shortcut (`/`).
- **Favorites & Recents**: Star your favorite tools to pin them to the top; automatically tracks recent tools for quick launch.
- **Offline Instant Mini-Tools**:
  - **JSON Formatter & Validator**: Beautify (2 spaces), minify, detect errors, and copy.
  - **Base64 Encoder / Decoder**: UTF-8 and URL-safe Base64 conversion.
  - **JWT Decoder**: Token inspection with expiration check and formatted payload.
  - **Unix Timestamp Converter**: Live epoch clock, epoch to UTC/Local date, and date to epoch converter.
  - **UUID v4 Generator**: Generate single or batch UUIDs with 1-click copy.
  - **URL Encoder / Decoder**: Safe component encoding and decoding.
  - **Quick Calculators**: Instant percentage calculator and salary hike estimator.
- **Chrome Side Panel**: Click the side panel icon in the header to dock OrbitBoard right alongside your active browser tab.
- **Right-Click Context Menus**: Select text on any webpage and right-click to format JSON, decode Base64, decode JWT, or convert timestamps with in-page toast feedback.

---

## How to Install in Chrome (Unpacked Development Mode)

1. Open Google Chrome.
2. In the address bar, navigate to:
   ```text
   chrome://extensions
   ```
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. In the file picker, select the `extension` folder inside this repository:
   ```text
   /Users/apple/workorbit/extension
   ```
6. The **OrbitBoard - Quick Tools & Utilities** extension is now installed and active!
7. Pin the OrbitBoard icon in your Chrome toolbar for instant access.

---

## Directory Structure

```text
extension/
├── manifest.json              # Manifest V3 specification
├── CHROMEWEBSTORE.md          # Chrome Web Store listing, permissions & disclosures
├── icons/                     # Icons generated at exact required dimensions
│   ├── icon-16.png            # 16x16 px icon
│   ├── icon-48.png            # 48x48 px icon
│   └── icon-128.png           # 128x128 px store icon
├── background/
│   └── service-worker.js      # Background service worker, context menus & toasts
├── popup/
│   ├── popup.html             # Popup HTML interface
│   ├── popup.css              # Dark-mode styling matching OrbitBoard
│   └── popup.js               # Search, tabs, favorites, recents, and mini-tools
├── sidepanel/
│   ├── sidepanel.html         # Chrome Side Panel HTML interface
│   ├── sidepanel.css          # Full-height docked layout styling
│   └── sidepanel.js           # Side panel controller
├── data/
│   └── tools.js               # Curated OrbitBoard 53+ tools catalogue
└── README.md                  # Installation and usage instructions
```

---

## Publishing to the Chrome Web Store

1. Review `CHROMEWEBSTORE.md` for store descriptions, permissions justifications, and privacy disclosures.
2. Create a distribution zip file containing the contents of `extension/` (excluding `.DS_Store` or git files):
   ```bash
   cd extension
   zip -r ../orbitboard-extension.zip . -x "*.DS_Store" "*__MACOSX*"
   ```
3. Go to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
4. Click **New Item** and upload `orbitboard-extension.zip`.
5. Copy the fields directly from `CHROMEWEBSTORE.md`.
