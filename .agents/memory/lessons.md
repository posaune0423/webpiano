# Project lessons

- 2026-08-26 — shadcn v4 expresses the requested `base-nova` setup as `--preset nova --base base`; the resulting `components.json` style remains `base-nova`.
- 2026-08-26 — Serwist injects a webpack config even when disabled. Next.js 16 therefore needs an explicit `next dev --turbopack`; production PWA generation remains `next build --webpack`.
- 2026-08-26 — The Cloudflare target is the `daiko` account and only the `webpiano.xyz` apex custom domain. `www` is intentionally absent.
- 2026-08-26 — Cloudflare validates compatibility dates in UTC. While local time was already August 26, `2026-08-26` was rejected as future-dated, so the initial deploy uses `2026-08-25`.
- 2026-08-26 — `/` is the playable instrument, not a marketing LP. Keep PC-keyboard, pointer, sustain, and audio state separated, and release voices only after the final input source for a MIDI note ends.
- 2026-08-26 — Keep every test below `tests/`: isolated logic in `tests/unit`, rendered and repository contracts in `tests/integration`, browser journeys in `tests/e2e`, and Bun DOM setup in `tests/support`.
- 2026-08-26 — Do not fork `/` into PC and smartphone products. Keep one responsive touch-capable instrument, optimize installed mobile use for landscape, and reserve `/pedal/[sessionId]` for QR-paired remote sustain.
- 2026-08-26 — Space and the remote pedal are independent sustain owners. Only the final source release disables sustain; DataChannel loss removes the remote source within the 750ms deadman window.
- 2026-08-26 — Keep request/response operations in tRPC + TanStack Query, but keep signaling in the Cloudflare native Hibernation WebSocket because tRPC's WebSocket adapter targets Node `ws`. Share Valibot wire schemas across browser and Durable Object.
- 2026-08-26 — Next dev cannot load a Durable Object class exported by the custom OpenNext Worker. Use `bun run dev` for the responsive instrument and `bun run preview` for the full tRPC/DO/WebRTC pairing flow. The server-owned `PEDAL_ALLOW_STUN_ONLY` setting permits direct local/LAN/production connectivity; TURN remains an optional reliability fallback.
- 2026-08-26 — Cloudflare Builds and clean CI do not have the gitignored `cloudflare-env.d.ts`; run `wrangler types` before quality and OpenNext builds. Release through a PR merged to `main`, then let the connected Cloudflare Build run `cf:build` and `cf:deploy` automatically.
