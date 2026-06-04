# Map of Changes: Skill Exchange Redesign

This document outlines the modifications made to restructure the Skill Exchange page into a full-screen, high-legibility dark dashboard.

## 1. SkillExchange.jsx
**File Path**: [SkillExchange.jsx](file:///c:/Users/prith/OneDrive/zwapy2/zwapy-preimplementation/src/pages/SkillExchange.jsx)

### Added Info Dropdown State
- Inserted `const [infoOpen, setInfoOpen] = useState(false);` on line 94 to toggle the visibility of the new coin rules and certificate info panel.

### Sticky Navbar Restructuring
- Placed navigation tabs (`Browse`, `Requests`, `Sessions`, `+ Post`) inside `<nav className="navbar-tabs">` in `<header className="topbar">` to serve as the primary centered navigation.
- Placed the coin balance (`🪙 {userData?.coins}`) and the `← Back` button inside `<div className="topbar-right">`.
- Removed the old centered tabs element from the main content layout.

### Slim Info Bar & Overlay Dropdown
- Replaced the large inline rules and certificate cards with a compact `<div className="info-bar">` positioned under the navbar.
- The info bar holds a toggleable `ⓘ Rules` button that displays the overlay rules panel (`<div className="info-dropdown">`) upon state change.

### Stats Strip Alignment
- Moved `<div className="stats-strip">` to sit directly below the new info bar.

---

## 2. SkillExchange.css
**File Path**: [SkillExchange.css](file:///c:/Users/prith/OneDrive/zwapy2/zwapy-preimplementation/src/pages/SkillExchange.css)

### Full-Screen Width Override
- Removed `max-width: 1100px` and `margin: 0 auto` from `.layout`.
- Applied `width: 100vw !important` and `margin: 0 !important` on `.se-body` and `max-width: 100% !important` on `.layout` to guarantee the app stretches to the left and right window borders.

### Centered Navbar Layout
- Styled `.navbar-tabs` as a flexbox centered horizontally on desktop and scrollable horizontally on mobile screens.
- Styled `.topbar-right` to align coins and back buttons cleanly.

### Info Bar & Dropdown Positioning
- Positioned `.info-dropdown` absolutely beneath the info bar with a high `z-index` so rules float above other layout elements without pushing them down.

### Enlarge Font Sizes & Padding
- **Logo text**: Enlarged to `1.25rem`.
- **Navigation tabs**: Enlarged to `0.95rem` with `10px 20px` padding.
- **Coin display**: Enlarged to `0.95rem` with `6px 12px` padding.
- **Back button**: Enlarged to `0.8rem` with `8px 16px` padding.
- **Info label**: Enlarged to `0.75rem`.
- **Info toggle button**: Enlarged to `0.8rem`.
- **Stats numbers**: Enlarged to `1.85rem` with labels at `0.8rem`.
- **Search bar**: Enlarged input text to `0.95rem` with `12px 14px 12px 36px` padding.
- **Filter tabs**: Enlarged to `0.82rem` with `10px 16px` padding.
- **Cards (General)**: Enlarged name tags to `1rem`, universities to `0.75rem`, times to `0.7rem`, swap text to `0.98rem`, and description body to `0.88rem`.
- **Requests & Sessions**: Enlarged requests card titles to `1.05rem`, message quotes to `0.88rem`, session titles to `1.08rem`, participant details to `0.8rem`, zoom join button to `0.92rem`, and certificate progress label to `0.8rem`.

### Flat Aesthetic
- Adjusted all badges/status chips (`.ci-badge`, `.rc-status`, `.ex-tag`) to use flat colored background chips with sharp corners (max 4px radius) rather than pill outlines.
