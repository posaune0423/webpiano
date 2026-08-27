# Testing

## Policy

- Write a failing test before custom behavior, then implement the smallest passing change.
- DOM behavior uses Bun, Happy DOM, and Testing Library.
- Static contract tests are allowed for generated assets, manifest references, lint configuration, environment files, and deployment configuration.
- Browser layout and responsive behavior use Playwright against a production build or OpenNext preview.
- Do not use fixed sleeps in browser tests.
- A test that merely reads component source text is not evidence of rendered component behavior.
- UI changes require current-UI-based wireframes in `docs/wireframes/` before production component changes.
- Async and conditional UI tests compare loading and resolved container geometry. A spinner without a
  same-size reserved slot is not an acceptable loading state.

## Commands

```sh
bun run test:unit
bun run test:integration
bun run test:e2e
bun run test:e2e:pwa
bun run typecheck
bun run lint
bun run build
bun run cf:build
```

## Layout

- `tests/unit` contains isolated logic and pure configuration-function tests.
- `tests/integration` contains rendered component, repository contract, asset, environment, and runtime integration tests.
- `tests/e2e` contains browser and PWA journeys executed by Playwright.
- `tests/support` contains Bun DOM setup shared by unit and integration tests.

## Acceptance surfaces

- Immediate standard-piano rendering, explicit `32 notes · 37 keys` counts, one 88-key navigator with a draggable STANDARD gauge, button and `←` / `→` semitone movement, a stable count marker across natural/sharp ranges, keyboard/pointer input, sustain, and stuck-note cleanup.
- Opt-in Dual Range mode reusing the same 88-key navigator with two independently draggable LOWER/UPPER gauges, session-only settings, and safe drop-time layout changes.
- Header semantics and visuals: the pedal trigger distinguishes unlocked and locked sustain, Space toggles the same manual lock without keyup release, `SINGLE | DUAL` is an exclusive ToggleGroup, the fixed-width Install trigger does not shift when capability changes, and the sound button exposes Mute/Unmute through `aria-pressed` and matching speaker icons while assistive engine status remains live.
- Muting ramps existing voices silent, starts later voices muted, restores every active voice on unmute, and does not change the selected keyboard mode.
- Pedal-menu discovery, manual sustain lock, and fixed-geometry QR loading/resolved states.
- Responsive touch piano on phones, with 844×390 landscape as the playable mobile surface and a rotation guide at 390×844 portrait.
- Typed tRPC session/ICE/end mutations, capability validation, server-gated STUN connectivity, and optional TURN credentials.
- Durable Object host/guest admission, authenticated-only relay, waiting/ready signaling, expiry, rate limits, and WebSocket message validation.
- WebRTC offer/answer/ICE exchange, ordered pedal messages, source-owned sustain, and 750ms deadman release.
- QR pairing dialog and the full-screen `/pedal/[sessionId]` touch controller.
- Offline fallback, PWA manifest, captured Chromium install prompt, installed state, and iPhone/iPad Add to Home Screen guidance.
- Asset format, dimensions, budgets, and icon purposes.
- Oxlint native and JavaScript plugin contract.
- Desktop 1440×900, mobile landscape 844×390, and portrait 390×844 screenshots without document overflow.
- Service worker registration and offline navigation in production preview.
- Cloudflare workerd preview and the live `https://webpiano.xyz` deployment.
