# webpiano Design System

webpiano is a quiet, precise digital instrument. Its interface borrows from a concert grand piano: black lacquer, warm ivory, restrained brass, and fine metal seams. It must feel crafted, never theatrical.

## Tokens

All product UI uses semantic variables from `src/app/globals.css`; component files do not introduce raw colors.

| Role           | Token                    | Intent                                              |
| -------------- | ------------------------ | --------------------------------------------------- |
| Stage          | `background` / `lacquer` | Near-black piano lacquer with depth, not pure black |
| Surface        | `card` / `popover`       | Charcoal panels separated by material and border    |
| Copy           | `foreground` / `ivory`   | Warm ivory instead of stark screen white            |
| Secondary copy | `muted-foreground`       | Quiet labels and explanatory text                   |
| Detail         | `brass` / `ring`         | Restrained brass for status and focus only          |
| Seam           | `border`                 | Thin, low-contrast metal edge                       |

The base radius is 4px. Panels may use 8px (`rounded-lg`); controls and labels stay at 4px. Pills are not part of this system.

## Typography

- Display: Cormorant Garamond, medium weight, close tracking. Use for the wordmark and large instrument statements.
- Body: Inter. Use for readable product copy and controls.
- Diagnostic: Space Mono. Use sparingly for keyboard mappings, status, and technical labels.
- All three fonts are bundled by `next/font`; the deployed page does not call a font CDN at runtime.

## Spacing

- Use Tailwind `gap-*` for sibling rhythm; do not use `space-*`.
- Base content padding is 20px on mobile, 32px on tablet, and 48px on desktop.
- Dense controls use 4–8px gaps. Content groups use 20–32px. Major sections use 40–64px.
- Keep one strong alignment edge. Generous empty space is intentional and is not filled with decorative copy.

## Components

- Compose from shadcn Base UI components and their variants. Use `cn()` for class composition.
- Components use semantic tokens only; raw color values belong in the token layer.
- Badges are rectangular instrument labels, never promotional pills.
- Borders are finer and more important than shadows. Shadows communicate physical depth only on primary panels.
- No fake call-to-action is shown for a feature that is not available.
- Dynamic content never claims layout after it resolves. Its container reserves the final geometry,
  and loading states use matching shadcn Skeleton blocks so content replaces them in place.
- `/` opens directly into the standard 32-note single keyboard with a shared approximately 8.2:1 A0–C8 navigator and one draggable STANDARD range. Dual Range is an explicit opt-in header mode and never replaces the simple first view.
- Dual Range reuses the same 88-key navigator with two draggable, semitone-snapped translucent LOWER/UPPER ranges. LOWER exposes 17 bindings (`Z–/`) and UPPER exposes 20 (`Q–]`) in enlarged keyboards below it.
- The standard first view exposes 32 notes from the same 37 physical bindings, combines overlapping key labels, and moves the complete range one semitone at a time by dragging the navigator or using the global `←` / `→` shortcuts.
- The standard range summary reserves a 56px slot for its note span so adding one or two `♯` glyphs never shifts the trailing `· 32 notes` label.
- A slim status strip immediately below the header carries one fixed-width transposition readout and a subtle arrow-key guide, leaving the navigator and playable piano free of extra status UI. It shows `KEY C` with `← → MOVE RANGE` in Single mode and a compact `L C · U C` with `SELECT RANGE · ← → FINE MOVE` in Dual mode; `KEY` describes chromatic transposition and never claims a major or minor mode.
- The same summary distinguishes `32 notes` (unique pitches on the merged standard keyboard) from `37 keys` (physical QWERTY bindings).
- The instrument uses landscape as the primary phone layout. Portrait shows only a restrained orientation guide; the playable surface is not compressed into portrait.
- Piano keys are specialized native buttons with visible note/PC-key labels, a physical two-black/three-black pattern, pressed state, pointer capture, and keyboard/assistive activation.
- “Use phone as pedal” opens a focused shadcn Dialog with a short-lived QR code. After pairing, the Dialog closes so the keyboard remains playable and the header retains the connection control.
- The pedal icon opens one menu containing Sustain Lock and “Use phone as pedal”. Its open-lock/closed-lock detail distinguishes unlocked and locked state, while the button surface still reflects sustain arriving from either the lock or phone pedal. Space toggles the same Sustain Lock instead of acting as a hold-to-sustain key. The QR dialog keeps one fixed-height session slot across creating, waiting, failure, and connected states.
- Header controls keep one clear responsibility each: the pedal icon owns sustain state, an explicit `SINGLE | DUAL` ToggleGroup selects keyboard mode, the fixed-width Install control invokes a captured desktop install prompt directly and otherwise opens the A2HS Drawer, and the speaker button toggles Mute/Unmute with `Volume2`/`VolumeX`. Transposition and movement guidance live in the status strip below the header, while sustain and audio-engine status remain available to assistive technology without duplicate visual badges.
- The Install control never mounts or unmounts in response to browser capability. Its fixed header slot remains stable while supported desktop browsers receive the captured native prompt in one click, and the Drawer switches a reserved, same-geometry content area between shadcn Skeleton, native install fallback, iPhone/iPad Add to Home Screen instructions, generic browser instructions, and installed confirmation.
- `/pedal/[sessionId]` is a dedicated full-screen controller: small diagnostic connection copy above one large metal pedal rendered with semantic-token SVG/CSS. It has no piano keyboard or marketing content.

## Wireframes

- Before changing UI structure or wording, capture the current rendered UI and create desktop and affected mobile wireframes under `docs/wireframes/`.
- Wireframes extend the actual product surface and semantic tokens; they are not independent redesigns or generic mockups.
- The earlier semitone-range exploration is retained in `semitone-range-standard-desktop.png`, `semitone-range-dual-desktop.png`, and the corresponding dragging/mobile landscape variants; the adopted control-free piano surface is recorded by the transposition/status-strip references below.
- The range-label comparison is recorded in `standard-range-label-natural-desktop.png`, `standard-range-label-sharp-current-desktop.png`, and the fixed-slot `standard-range-label-fixed-*-desktop.png` pair.
- The combined note/binding count is recorded in `standard-range-summary-counts-desktop.png`.
- The approved shared navigator and icon system are recorded in `unified-88-navigator-standard-desktop.png`, `unified-88-navigator-dual-desktop.png`, their mobile landscape counterparts, and `header-icons-labeled-dual-desktop.png`.
- The explicit mode and sound toggle states are recorded in `header-mode-sound-toggles-single.png`, `header-mode-sound-toggles-dual-muted.png`, and the mobile header variant.
- The approved Sustain Lock and PWA install flow is recorded in `pedal-lock-states-desktop.png`, `pedal-install-header-desktop.png`, `a2hs-drawer-desktop.png`, and `a2hs-drawer-mobile-landscape.png`.
- The unobtrusive below-header status strip, arrow guide, and piano surface without range steppers are recorded in `transposition-key-standard-desktop.png`, `transposition-key-dual-desktop.png`, and `transposition-key-standard-mobile-landscape.png`.

## Motion

- Motion is functional: key press, pedal state, focus, loading, or route change.
- The phone pedal moves only while touched. Connecting/reconnecting may pulse; connected is steady, and all non-essential status animation stops under `prefers-reduced-motion`.
- Default transitions stay within 120–220ms with restrained easing.
- Do not animate the instrument merely to make it look active; key motion must reflect input.
- `prefers-reduced-motion` collapses non-essential animation and smooth scrolling.

## Do / Don’t

Do:

- Let photography, typography, and material contrast carry the composition.
- Preserve natural ivory and black-lacquer contrast.
- Keep brass to small status and focus details.
- Make small keyboard and diagnostic labels crisp and legible.

Don’t:

- Use neon, red/blue signals, sci-fi dashboards, or an AI observation-room motif.
- Use loud gradients, excessive glass, oversized glow, generic blobs, or decorative grids.
- Use fully rounded pills, oversized radii, or cartoon-like keyboard illustrations.
- Invent controls, pricing, or availability before those features exist.

## Generated image masters

Generation method: OpenAI ImageGen built-in mode. The generated masters are copied into this repository before derivatives are produced.

Hero prompt:

> Create a wide 3:2 photorealistic luxury grand piano hero photograph, but show ONLY ONE COMPLETE MUSICAL OCTAVE in close-up so the geometry can be exact. The visible keyboard must contain exactly eight warm ivory white keys from C through the next C, and exactly five glossy black keys arranged as one group of exactly two black keys, then a wide natural gap with no black key between the third and fourth white keys, then one group of exactly three black keys, then another clear gap before the final white key. No other keys may be visible, not even cropped or reflected keys. Make every key boundary straight, rectangular, evenly spaced, mechanically plausible, and sharply readable. Place this one-octave keyboard and a portion of glossy black lacquer grand-piano case in the right half to right two-thirds of the image, receding at a gentle diagonal. Leave generous uninterrupted dark studio negative space on the left for HTML copy. Soft controlled studio light, realistic black lacquer reflections, natural ivory texture, one tiny restrained brass detail, quiet timeless editorial product photography. No people, hands, sheet music, room clutter, text, letters, monogram, manufacturer logo, watermark, neon, exaggerated bokeh, duplicated keys, extra keys, fused keys, warped keys, melting keys, or CGI/plastic look.

Icon prompt:

> Square photorealistic icon master showing about one octave of premium grand piano keys, front-facing with a very gentle top-down angle. The ivory white keys and glossy black lacquer are high contrast and instantly readable at 32px. The black keys must have physically accurate dimensions, spacing, and the repeating two-black-keys then three-black-keys pattern. Center the entire keyboard motif inside a generous maskable safe zone with dark lacquer extending to every edge. Soft studio reflection, subtle brass accent only if it does not reduce clarity. No text, no letters, no monogram, no logo, no watermark, no hands, no extra objects, no neon, no warped boundaries, no duplicated or melting keys, no cartoon or CGI look.

Adopted project paths:

- Hero source master: `assets/brand/masters/piano-keys-hero-master.png`
- Icon source master: `assets/brand/masters/piano-keys-icon-master.png`
- Hero derivative: `public/brand/piano-keys-hero.webp`
- Icon master: `public/brand/piano-keys-icon.png`
- Social derivative: `src/app/opengraph-image.jpg`
- Application icons: `src/app/icon.png`, `src/app/apple-icon.png`, and `public/icons/*.png`

The photography remains brand and social collateral. It is intentionally not placed in front of the playable keyboard on the top page.

ImageGen source paths at generation time:

- `/Users/asumayamada/.codex/generated_images/01a03279-8e03-7880-9613-382d8a0c6645/exec-09e55fe6-bed3-4717-915d-f1e8f7cd7d40.png`
- `/Users/asumayamada/.codex/generated_images/01a03279-8e03-7880-9613-382d8a0c6645/exec-8d623e2d-3264-40b8-a22f-ba12b5e7520e.png`

Inspection on 2026-08-26: the first two long-keyboard hero candidates were rejected because perspective generation placed black keys at almost every white-key seam. The adopted hero deliberately shows one complete octave: eight straight white keys and five black keys in an unmistakable two-key group followed by a three-key group, with both natural gaps visible. It contains no text or trademark and has natural lacquer reflections. The icon also has a clearly separated two-key group followed by a three-key group, straight boundaries, no extra keys, and remains readable in the 512px maskable derivative. The 1024px icon master and every delivery icon remain below the agreed 200KB budget; the hero and OG outputs remain below their 700KB and 500KB budgets.
