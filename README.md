# webpiano

A premium, responsive Web/PWA piano for `webpiano.xyz`.

The top page opens directly into a playable two-octave instrument on computers and phones. It supports PC keyboard input, pointer/touch input, Space-key sustain, a lightweight Web Audio piano synth, landscape-first mobile layout, an installable PWA shell, offline fallback, and Cloudflare Workers deployment.

A second phone can act as a real-time sustain pedal. The piano creates a short-lived QR pairing link through a type-safe tRPC API, Cloudflare Durable Objects exchange WebRTC signaling, and the pedal state travels through an encrypted peer-to-peer DataChannel. STUN enables direct connectivity, with Cloudflare Realtime TURN available as an optional fallback.

Keyboard mapping:

- `Z S X D C V G B H N J M` — C3 through B3
- `Q 2 W 3 E R 5 T 6 Y 7 U` — C4 through B4
- `Space` — sustain pedal

## Stack

- Next.js 16.3.2, React 19.2.8, TypeScript 5.9.3, React Compiler
- Bun 1.4.0, Tailwind CSS 4.3.3, shadcn Base UI (`base-nova`)
- Serwist 9.5.12, OpenNext Cloudflare 1.20.2, Wrangler 4.125.0
- tRPC 11.18.0, TanStack Query 5.102.4, Valibot 1.4.2
- WebRTC DataChannel, Cloudflare Durable Objects, Cloudflare Realtime TURN
- Oxlint, Oxfmt, Lefthook, Knip, Bun Test, Testing Library, Happy DOM, Playwright

## Development

```sh
bun install --frozen-lockfile
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). Development uses Turbopack; production uses webpack so Serwist can generate the service worker.

The responsive piano can be developed with `bun run dev`. Cloudflare does not expose a Durable Object declared inside the same Worker to Next dev, so the complete tRPC, Durable Object, and WebRTC pairing flow runs through `bun run preview`. The committed non-secret `.dev.vars` enables STUN-only for local and LAN preview. Production also permits direct STUN connectivity while TURN remains optional.

## Quality

```sh
bun run check
bun run test:e2e
bun run test:e2e:pwa
bun run cf:build
bun run preview
```

See [DESIGN.md](docs/DESIGN.md), [LINTING.md](docs/LINTING.md), and [TESTING.md](docs/TESTING.md) for project contracts.

## Deployment

`wrangler.jsonc` targets the `webpiano` Worker and only the `webpiano.xyz` apex custom domain.

```sh
bunx wrangler whoami
bun run deploy
```

Deployment requires an authenticated Wrangler session for Cloudflare account `daiko`. No secret is stored in this repository.

For more reliable connectivity across restrictive NATs and firewalls, production can optionally use the following Worker secrets. The TURN key remains server-side and only short-lived credentials reach browsers.

```sh
bunx wrangler secret put TURN_KEY_ID
bunx wrangler secret put TURN_KEY_API_TOKEN
```
