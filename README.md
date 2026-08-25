# webpiano

A premium, PC-keyboard-first Web/PWA piano for `webpiano.xyz`.

The initial release contains the brand surface, generated piano photography, installable PWA shell, offline fallback, and Cloudflare Workers deployment path. Audio playback, sound packs, smartphone pedal input, payments, and marketplace behavior are intentionally deferred.

## Stack

- Next.js 16.3.2, React 19.2.8, TypeScript 5.9.3, React Compiler
- Bun 1.4.0, Tailwind CSS 4.3.3, shadcn Base UI (`base-nova`)
- Serwist 9.5.12, OpenNext Cloudflare 1.20.2, Wrangler 4.125.0
- Oxlint, Oxfmt, Lefthook, Knip, Bun Test, Testing Library, Happy DOM, Playwright

## Development

```sh
bun install --frozen-lockfile
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). Development uses Turbopack; production uses webpack so Serwist can generate the service worker.

## Quality

```sh
bun run check
bun run e2e
bun run e2e:pwa
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
