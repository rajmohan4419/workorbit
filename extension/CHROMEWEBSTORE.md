# Chrome Web Store Listing — OrbitBoard - Quick Tools & Utilities

> Last Updated: 2026-09-25

## Store Listing

**Extension Name** [REQUIRED]
OrbitBoard - Quick Tools & Utilities

**Short Description** [REQUIRED]
Instant developer utilities, calculators, converters, and quick launch to 50+ tools on OrbitBoard directly from your browser.

**Detailed Description** [REQUIRED]
OrbitBoard brings an entire suite of everyday utilities, developer helpers, and productivity calculators right to your Chrome toolbar and side panel.

No more switching tabs or searching for one-off web tools. Format JSON, decode Base64 and JWTs, convert Unix timestamps, generate UUIDs, and calculate percentages instantly — completely offline and private on your device.

Key Features:
- Instant Tools Directory: Quickly search and launch over 50 free web utilities across Developer, Everyday, PDF, Career, and Finance categories.
- Favorite Pinning & Recents: Bookmark your most frequently used tools to the top for 1-click access, with automatic recent tool tracking.
- In-Extension Developer Toolkit:
  • JSON Formatter & Minifier: Validate and format JSON with syntax error detection
  • Base64 Encoder / Decoder: Convert text to Base64 and back with full Unicode support
  • JWT Decoder: Inspect token headers and payloads with live expiration check
  • Unix Timestamp Converter: Live epoch clock and bidirectional date conversion
  • UUID v4 Generator: Generate single or batch UUIDs with instant copy
  • URL Component Encoder / Decoder: Safely handle query parameters and URLs
- Built-In Quick Calculators: Fast percentage math, increases/decreases, and salary hike calculations.
- Chrome Side Panel Support: Dock the tools panel to the side of your window so it stays open alongside your documents, pull requests, and web pages.
- Right-Click Context Menu Actions: Highlight text on any page to format JSON, decode Base64/JWT, or convert Unix timestamps with instant on-screen results.

How to Use:
1. Click the OrbitBoard icon in your toolbar to open the quick launcher and offline tools.
2. Click the Side Panel icon in the header to dock tools alongside your browser workspace.
3. Select any text on a webpage, right-click, and choose "OrbitBoard Tools" to format or decode content without leaving your page.

Privacy & Security:
OrbitBoard values your privacy. All formatting, decoding, and calculations execute entirely inside your browser. No personal data, tokens, or copied text are ever sent to an external server.

Support & Feedback:
Visit https://orbitboard.in for full browser tools and feedback.

**Category** [REQUIRED]
Developer Tools

**Single Purpose** [REQUIRED]
Provides quick browser access to offline developer utilities, calculators, and search navigation for OrbitBoard tools.

**Primary Language** [REQUIRED]
English

---

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `icons/icon-128.png` |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | 🟡 To capture | Popup Directory Search & Favorites |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | 🟡 To capture | In-Extension JSON & Developer Tools |
| Screenshot 3 [RECOMMENDED] | 1280×800 or 640×400 | 🟡 To capture | Chrome Side Panel Docked Workspace |
| Screenshot 4 | 1280×800 or 640×400 | 🟡 To capture | Right-Click Context Menu Actions |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | promo-small.png |
| Marquee Promo Tile | 1400×560 | ⬜ Not created | promo-marquee.png |

### Screenshot Notes
- Screenshot 1: Shows the popup open with the live search filter active, showing category chips and starred favorite tools.
- Screenshot 2: Shows the Instant Utilities tab with formatted JSON and JWT inspection in action.
- Screenshot 3: Shows Chrome with the OrbitBoard Side Panel docked alongside a web application.
- Screenshot 4: Shows right-clicking a JSON/Base64 snippet on a web page with the OrbitBoard context menu options and floating result toast.

---

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Used to save the user's pinned favorite tools, recently used tools history, and user UI tab preferences locally in the browser. |
| `contextMenus` | permissions | Used to add helpful right-click menu actions ("Format JSON", "Decode Base64", "Decode JWT", "Convert Timestamp") when the user selects text on a web page. |
| `scripting` | permissions | Used to display a floating feedback notification on the active web page when a context menu action (such as decoding Base64 or formatting JSON) is triggered. |
| `activeTab` | permissions | Used exclusively upon explicit user action (clicking a context menu item) to temporarily access the active tab and display the feedback toast without requiring broad host permissions. |
| `sidePanel` | permissions | Used to allow the OrbitBoard utility panel to be docked as a persistent side panel alongside the user's active browsing session. |

---

## Privacy & Data Use

### Data Collection
- Does the extension collect user data? **No**
- Does the extension transmit data to external servers? **No**
- Does the extension use analytics or tracking? **No**

### Host Permissions
- Host permissions declared: **None** (Zero host permissions requested; utilizes `activeTab` strictly upon explicit user interaction).

---

## Version History

### Version 1.0.0 — 2026-09-25
- Initial release of OrbitBoard Chrome Extension (Manifest V3)
- Instant search and launcher across 53+ OrbitBoard tools
- Favorite pinning and recent tools history saved locally
- Offline developer utilities: JSON formatter/validator, Base64 encoder/decoder, JWT decoder, Unix timestamp converter, UUID v4 generator, URL encoder/decoder, Percentage & Salary Hike calculators
- Chrome Side Panel integration for docked multitasking
- Right-click context menus with floating in-page toast feedback
