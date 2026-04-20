# Design System Specification: High-End Educational Editorial

## 1. Overview & Creative North Star
**Creative North Star: "The Academic Prism"**
This design system moves beyond the utility of a standard LMS to create a high-end, editorial environment. It envisions the platform as a sophisticated digital curator where education meets premium interaction. The system rejects the "boxed-in" template look of traditional educational software, instead utilizing **intentional asymmetry**, **glassmorphism**, and **tonal layering** to create a sense of professional authority and gamified wonder.

The "Academic Prism" focuses on light as a metaphor for knowledge. Surfaces are treated like sheets of fine optic glass, and the 5-point star logo serves as the chromatic anchor, refracting its specific colors into distinct, immersive sub-sections for each grade level and project.

---

## 2. Colors: Chromatic Sub-Systems
The palette is built on a "Professional Neutral" foundation, punctuated by a dynamic accent system that defines the user's current academic context.

### Base Palette (Material Design Tokens)
- **Background (`surface`):** `#F4F6FF` — A crisp, clean blue-tinted white.
- **Primary Text (`on-surface`):** `#212F43` — Deep Slate for high-quality legibility.
- **Secondary Text (`on-surface-variant`):** `#4E5C71` — For meta-data and descriptions.

### Sectional Accent System (The Dynamic Core)
Each section adopts a specific chromatic identity that influences the `surface-tint` and interactive elements:
1.  **9th Grade:** Yellow (`#FBBF24`)
2.  **12th Grade/Baccalaureate:** Red (`#EF4444`)
3.  **General English:** Blue (`#3B82F6`)
4.  **1000 Steps Project:** Green (`#10B981`)
5.  **IELTS Preparation:** Purple (`#8B5CF6`)

### The "No-Line" Rule & Surface Hierarchy
To maintain an "Editorial" feel, **prohibit 1px solid borders for sectioning.** Boundaries are defined by background shifts:
- **Level 1 (Base):** `surface` (#F4F6FF)
- **Level 2 (Sectioning):** `surface-container-low` (#EBF1FF)
- **Level 3 (Interactive Cards):** `surface-container-lowest` (#FFFFFF)

**The Glass & Gradient Rule:** For hero sections and primary CTAs, use a subtle linear gradient (155°) from the Sectional Accent to its corresponding `container` token. This adds a "visual soul" that flat colors lack.

---

## 3. Typography: Bilingual Precision
The system uses a pairing of **Plus Jakarta Sans** (English/Latin) and **IBM Plex Sans Arabic**. This combination ensures that the "Najm" personality remains consistent across RTL and LTR layouts.

- **Display (Large/Med/Small):** `plusJakartaSans`, 3.5rem to 2.25rem. Used for landing page hero headers and large numeric gamification stats (e.g., "1000 Steps").
- **Headline (Large/Med/Small):** `plusJakartaSans`, 2rem to 1.5rem. Bold, authoritative, and spacious.
- **Title (Large/Med/Small):** `manrope`, 1.375rem to 1rem. Semi-bold for card titles and section headers.
- **Body (Large/Med/Small):** `manrope`, 1rem to 0.75rem. Optimized for long-form educational content with a 1.6 line-height.
- **Labels:** `manrope`, 0.75rem. Used for micro-copy and tags.

**Hierarchy Strategy:** Use high-contrast scale. A `Display-LG` title should sit near a `Body-MD` description to create a sophisticated, magazine-style layout.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are largely replaced by **Tonal Layering** to create a modern, lightweight feel.

- **The Layering Principle:** Depth is achieved by "stacking." A white card (`surface-container-lowest`) placed on a light-blue-gray background (`surface-container-low`) creates a natural lift.
- **Ambient Shadows:** For "floating" elements like floating action buttons or modal windows, use a "Tinted Ambient Shadow": 
  - `box-shadow: 0 20px 40px -12px rgba(33, 47, 67, 0.08);`
  - This mimics soft, natural light rather than a dark "drop shadow."
- **The "Ghost Border":** If a container requires further definition, use the `outline-variant` (#A0AEC6) at **15% opacity**. Never use a 100% opaque border.
- **Glassmorphism:** Navigation bars and sticky headers must use:
  - `background: rgba(244, 246, 255, 0.7);`
  - `backdrop-filter: blur(12px);`

---

## 5. Components: Gamified Modernity

### Buttons
- **Primary:** High-pill (`rounded-full`) with a subtle gradient of the Sectional Accent.
- **Secondary:** Transparent with a "Ghost Border" and `on-surface` text.
- **Tertiary:** Text-only with a subtle background shift on hover (`surface-container-high`).

### Gamified Leaderboards
- **Gold/Silver/Bronze Highlighting:** Do not use flat colors. Use metallic gradients with a 0.5px `outline-variant` border to suggest "minted" quality.
- **Star Integration:** Use the multi-colored star logo as a progress indicator. As a student completes a section (e.g., English), that specific point of the star glows with its section color.

### Cards & Lists
- **Rule:** Forbid the use of divider lines between list items. Use **Vertical White Space** (24px - 32px) to separate content modules.
- **Anatomy:** Cards use `rounded-lg` (1rem) and a `surface-container-lowest` background.

### Input Fields
- Soft, rounded corners (`rounded-md`).
- Focus state: A 2px glow using the `Sectional Accent` color with 20% opacity.

---

## 6. Do's and Don'ts

### Do:
- **Embrace Asymmetry:** Align text to the right for Arabic, but allow imagery or accent graphics to bleed off the left edge of the screen.
- **Use Tonal Contrast:** Use `surface-bright` and `surface-dim` to guide the eye toward the primary action.
- **Bilingual Fluidity:** Ensure that when switching from Arabic to English, the visual weight remains balanced by using equivalent font weights.

### Don't:
- **Don't use high-contrast borders:** 1px black or dark grey borders kill the "High-End" feel.
- **Don't clutter the UI:** Educational platforms often over-inform. Keep a minimum of 48px of "breathing room" between major content blocks.
- **Don't use generic icons:** Use thick-stroke (2px), rounded-cap icons that match the `manrope` font weight.
- **Don't mix Sectional Accents:** If a user is in the "IELTS" section, all accents (buttons, progress bars, highlights) must be Purple (`#8B5CF6`). Never mix section colors within a single view.