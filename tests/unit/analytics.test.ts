import { describe, expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { join } from "node:path"

describe("Google Analytics configuration", () => {
  test("uses the provided GA4 measurement ID", async () => {
    const analyticsModule = join(import.meta.dir, "../../src/constants/analytics.ts")
    expect(existsSync(analyticsModule)).toBeTrue()

    const { GOOGLE_ANALYTICS_ID } = await import("@/constants/analytics")
    expect(GOOGLE_ANALYTICS_ID).toBe("G-FPXJJ64H74")
  })
})
