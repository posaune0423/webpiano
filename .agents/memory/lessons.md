# Project lessons

- 2026-08-26 — shadcn v4 expresses the requested `base-nova` setup as `--preset nova --base base`; the resulting `components.json` style remains `base-nova`.
- 2026-08-26 — Serwist injects a webpack config even when disabled. Next.js 16 therefore needs an explicit `next dev --turbopack`; production PWA generation remains `next build --webpack`.
- 2026-08-26 — The Cloudflare target is the `daiko` account and only the `webpiano.xyz` apex custom domain. `www` is intentionally absent.
- 2026-08-26 — Cloudflare validates compatibility dates in UTC. While local time was already August 26, `2026-08-26` was rejected as future-dated, so the initial deploy uses `2026-08-25`.
- 2026-08-26 — `/` is the playable instrument, not a marketing LP. Keep PC-keyboard, pointer, sustain, and audio state separated, and release voices only after the final input source for a MIDI note ends.
- 2026-08-26 — Keep every test below `tests/`: isolated logic in `tests/unit`, rendered and repository contracts in `tests/integration`, browser journeys in `tests/e2e`, and Bun DOM setup in `tests/support`.
