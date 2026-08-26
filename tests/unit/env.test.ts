import { describe, expect, spyOn, test } from "bun:test"

import { createAppEnv } from "@/env"

describe("application environment", () => {
  test("accepts the public application URL", () => {
    const value = createAppEnv({
      NEXT_PUBLIC_APP_URL: "https://webpiano.xyz",
    })

    expect(value.NEXT_PUBLIC_APP_URL).toBe("https://webpiano.xyz")
  })

  test("rejects a malformed public application URL", () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {})

    try {
      expect(() => createAppEnv({ NEXT_PUBLIC_APP_URL: "not-a-url" })).toThrow()
    } finally {
      consoleError.mockRestore()
    }
  })
})
