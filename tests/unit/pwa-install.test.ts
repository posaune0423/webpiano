import { describe, expect, test } from "bun:test"

import { detectPwaPlatform, resolvePwaInstallState } from "@/lib/pwa-install"

describe("PWA install state", () => {
  test("detects iPhone and touch-capable iPad desktop user agents", () => {
    expect(
      detectPwaPlatform({
        maxTouchPoints: 5,
        platform: "iPhone",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
      }),
    ).toBe("ios")
    expect(
      detectPwaPlatform({
        maxTouchPoints: 5,
        platform: "MacIntel",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)",
      }),
    ).toBe("ios")
  })

  test("keeps ordinary desktop browsers on the generic path", () => {
    expect(
      detectPwaPlatform({
        maxTouchPoints: 0,
        platform: "MacIntel",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Chrome/140",
      }),
    ).toBe("other")
  })

  test("prioritizes installed, then native prompt, then manual instructions", () => {
    expect(
      resolvePwaInstallState({
        detected: false,
        installed: false,
        promptAvailable: false,
      }),
    ).toBe("checking")
    expect(
      resolvePwaInstallState({
        detected: true,
        installed: true,
        promptAvailable: true,
      }),
    ).toBe("installed")
    expect(
      resolvePwaInstallState({
        detected: true,
        installed: false,
        promptAvailable: true,
      }),
    ).toBe("installable")
    expect(
      resolvePwaInstallState({
        detected: true,
        installed: false,
        promptAvailable: false,
      }),
    ).toBe("manual")
  })
})
