import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { parse } from "jsonc-parser"

const root = join(import.meta.dir, "../..")

function read(path: string) {
  return readFileSync(join(root, path), "utf8")
}

describe("runtime contract", () => {
  test("keeps development on Turbopack and production on webpack", () => {
    const packageJson = JSON.parse(read("package.json")) as {
      scripts: Record<string, string>
    }

    expect(packageJson.scripts).toMatchObject({
      dev: "dotenvx run -f .env.development -- next dev --turbopack",
      build: "dotenvx run -f .env.production -- next build --webpack",
      "cf:build": "bun run cf:typegen && opennextjs-cloudflare build",
      "cf:deploy": "opennextjs-cloudflare deploy",
      preview: "bun run cf:build && opennextjs-cloudflare preview",
      deploy: "bun run cf:build && bun run cf:deploy",
      check:
        "bun run cf:typegen && bun run format:check && bun run lint && bun run test && bun run typecheck && bun run knip && bun run build",
    })
  })

  test("defines the typed public URL for development and production", () => {
    expect(read(".env.development")).toContain("NEXT_PUBLIC_APP_URL=http://localhost:3000")
    expect(read(".env.production")).toContain("NEXT_PUBLIC_APP_URL=https://webpiano.xyz")
  })

  test("provides the typed tRPC and TanStack Query client to application routes", () => {
    const layout = read("src/app/layout.tsx")

    expect(layout).toContain('import { PedalApiProvider } from "@/trpc/client"')
    expect(layout).toContain("<PedalApiProvider>")
    expect(layout.indexOf("<PedalApiProvider>")).toBeLessThan(
      layout.indexOf('<ViewTransition name="crossfade">{children}</ViewTransition>'),
    )
  })

  test("configures a production-only Serwist worker with an offline fallback", () => {
    const nextConfig = read("next.config.ts")
    const serviceWorker = read("src/app/sw.ts")

    expect(nextConfig).toContain('swSrc: "src/app/sw.ts"')
    expect(nextConfig).toContain('swDest: "public/sw.js"')
    expect(nextConfig).toContain('disable: process.env.NODE_ENV === "development"')
    expect(serviceWorker).toContain("handler: new NetworkOnly()")
    expect(serviceWorker).toContain("...defaultCache")
    expect(serviceWorker).toContain("navigationPreload: true")
    expect(serviceWorker).toContain("clientsClaim: true")
    expect(serviceWorker).toContain("skipWaiting: true")
    expect(serviceWorker).toContain('url: "/~offline"')
  })

  test("targets only the webpiano apex on the intended Cloudflare account", () => {
    const wrangler = parse(read("wrangler.jsonc")) as {
      account_id: string
      compatibility_date: string
      compatibility_flags: string[]
      main: string
      name: string
      routes: Array<{ custom_domain: boolean; pattern: string }>
      vars: { PEDAL_ALLOW_STUN_ONLY: string }
      workers_dev: boolean
    }

    expect(wrangler.name).toBe("webpiano")
    expect(wrangler.account_id).toBe("7046457855b37423c07b1b0c6014fe33")
    expect(wrangler.main).toBe("src/cloudflare/worker.ts")
    expect(wrangler.compatibility_date).toBe("2026-08-25")
    expect(wrangler.compatibility_flags).toContain("nodejs_compat")
    expect(wrangler.workers_dev).toBeFalse()
    expect(wrangler.routes).toEqual([{ pattern: "webpiano.xyz", custom_domain: true }])
    expect(wrangler.vars.PEDAL_ALLOW_STUN_ONLY).toBe("true")
  })
})
