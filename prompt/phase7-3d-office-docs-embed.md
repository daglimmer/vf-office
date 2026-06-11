# 3D Agent Office — Phase 7: Docs Portal + Dashboard Embed

## What you're building

Two features that connect the 3D Office to the VF Dashboard ecosystem:

### 1. Docs Portal (inside 3D Office HUD)
A file-tree browser panel accessible from the HUD sidebar that reads agent documentation live.

### 2. Dashboard Embed Mode
Make the 3D Office embeddable as an iframe inside the VF Dashboard without breaking its sticky nav or event handling.

---

## Feature 1: Docs Portal

### Source
The bridge adapter (`adapter/index.js`) already serves `/api/docs/tree` and `/api/docs/file?path=`. These endpoints are documented in the adapter code — use them.

### UI
- **Trigger:** New button in the HUD sidebar: 📄 "Docs"
- **Panel:** Slides in from right, 380px wide, frosted glass (match existing palette)
- **Tree:** Collapsible folder structure showing:
  - `skills/` — agent skill files
  - `souls/` — agent memory/soul files
  - `memory/` — shared memory
  - `docs/` — project documentation
- **Click a file** → renders markdown inline (use a lightweight markdown renderer like `marked` — add to package.json if needed)
- **Back button** returns to tree view

### States
- **Loading:** skeleton shimmer (match existing loading patterns)
- **Source down:** "Docs unavailable — adapter offline"
- **Empty directory:** "No files in this folder"

---

## Feature 2: Dashboard Embed Mode

### Goal
The VF Dashboard (Phase 8) will embed the 3D Office in an iframe at `/office`. The office must work cleanly inside an iframe without breaking.

### Changes needed

**Reading the embed flag:**
- When loaded with `?embed=1` in the URL, the office enters **embed mode**
- Detect this in `main.js` early (before Three.js init)

**Embed mode behavior:**
- **Hide top nav** (the room preset buttons stay visible — those are in-scene UI, not page nav)
- **Resize handler:** Canvas resizes to fill the iframe viewport — add `window.addEventListener('resize', ...)` that updates the Three.js renderer + CSS2D renderer
- **No scroll hijacking:** The iframe host handles scrolling
- **Back link to dashboard:** Small "← Dashboard" button in top-left corner that does `window.top.location.href = '/'` (only in embed mode, wrapped in try/catch for cross-origin safety)

**Non-embed mode (standalone):**
- When NOT in embed mode (`?embed=1` absent), everything works exactly as before
- No regressions on the standalone 3D Office

### Verification
- [ ] Open `/public/index.html?embed=1` → no page nav, canvas fills viewport, "← Dashboard" link visible
- [ ] Open `/public/index.html` (no embed flag) → full standalone, no changes
- [ ] Resize the browser window → canvas resizes correctly (both modes)
- [ ] Docs panel opens/closes, file tree browses, markdown renders
- [ ] Zero console errors in both modes

---

## DON'T DO
- Don't touch the room preset buttons or in-scene camera controls
- Don't modify the adapter API endpoints — they already work
- Don't change the existing HUD panels (notifications, timeline, infra strip, agent cards)
- Don't break the standalone mode
- Don't add new npm dependencies without confirming they're necessary
