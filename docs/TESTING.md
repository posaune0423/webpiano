# Testing

## Policy

- Write a failing test before custom behavior, then implement the smallest passing change.
- DOM behavior uses Bun, Happy DOM, and Testing Library.
- Static contract tests are allowed for generated assets, manifest references, lint configuration, environment files, and deployment configuration.
- Browser layout and responsive behavior use Playwright against a production build or OpenNext preview.
- Do not use fixed sleeps in browser tests.
- A test that merely reads component source text is not evidence of rendered component behavior.

## Commands

```sh
bun test
bun run e2e
bun run e2e:pwa
bun run typecheck
bun run lint
bun run build
bun run cf:build
```

## Acceptance surfaces

- Immediate piano rendering, 24-key physical mapping, keyboard/pointer input, sustain, and stuck-note cleanup.
- Offline fallback and PWA manifest.
- Asset format, dimensions, budgets, and icon purposes.
- Oxlint native and JavaScript plugin contract.
- Desktop 1440×900 and mobile 390×844 screenshots without overflow.
- Service worker registration and offline navigation in production preview.
- Cloudflare workerd preview and the live `https://webpiano.xyz` deployment.
