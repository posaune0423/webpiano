import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { parse } from "jsonc-parser"

const root = join(import.meta.dir, "../..")

test("binds the pedal Durable Object through the custom Cloudflare worker", () => {
  const wrangler = parse(readFileSync(join(root, "wrangler.jsonc"), "utf8")) as {
    durable_objects?: { bindings?: Array<{ class_name: string; name: string }> }
    main?: string
    migrations?: Array<{ new_sqlite_classes?: string[]; tag: string }>
    ratelimits?: Array<{
      name: string
      namespace_id: string
      simple: { limit: number; period: number }
    }>
  }

  expect(wrangler.main).toBe("src/cloudflare/worker.ts")
  expect(wrangler.durable_objects?.bindings).toContainEqual({
    class_name: "PedalSession",
    name: "PEDAL_SESSIONS",
  })
  expect(wrangler.migrations).toContainEqual({
    new_sqlite_classes: ["PedalSession"],
    tag: "v1",
  })
  expect(wrangler.ratelimits).toContainEqual({
    name: "PEDAL_SESSION_RATE_LIMITER",
    namespace_id: "26082601",
    simple: { limit: 5, period: 60 },
  })
  expect(readFileSync(join(root, "src/cloudflare/pedal-session-worker.ts"), "utf8")).toContain(
    "extends DurableObject",
  )
})
