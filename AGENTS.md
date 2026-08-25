# Agent Guidelines

## Project context

webpiano is a single Next.js App Router application for a premium, PC-keyboard-first Web/PWA piano. The top page opens directly into a playable two-octave instrument. Sample sound packs, smartphone pedal input, payments, and marketplace behavior belong in later feature work.

- Design system and generated-image record: `docs/DESIGN.md`
- Lint migration and supported rules: `docs/LINTING.md`
- Test policy and commands: `docs/TESTING.md`

## Development rules

- Use Bun 1.4.0 and Node.js 24 or newer.
- Develop behavior with TDD: Red, Green, then Refactor.
- Keep this a single Next.js application. Do not add Turborepo, workspaces, a database, or speculative service boundaries.
- Keep state, input mapping, and audio synthesis in separate modules.
- Use shadcn Base UI components and semantic tokens. Do not add raw colors in components.
- Use `gap-*`, not `space-*`, for sibling spacing. Compose classes with `cn()`.
- Do not advertise controls or features that do not exist.
- Run `bun run check` before handoff. Run Playwright when layout, responsive behavior, PWA, or browser behavior changes.

## Environment and deployment

- Commit non-secret `.env.development` and `.env.production` values.
- Never commit `.env.keys`, local overrides, tokens, or credentials.
- Use the existing Cloudflare account and apex route declared in `wrangler.jsonc`; do not add `www` or unrelated DNS records.
- A successful local build or CI run is not proof of a successful production deployment. Verify the live URL and deployed commit separately.

## Project memory

Record concise, evidence-based project lessons in `.agents/memory/lessons.md` when they prevent repeat mistakes or preserve a durable decision.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
