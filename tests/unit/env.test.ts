import { describe, expect, test } from "bun:test"

function importEnv(appUrl: string) {
  return Bun.spawnSync({
    cmd: [
      process.execPath,
      "-e",
      'import { env } from "./src/env.ts"; console.log(env.NEXT_PUBLIC_APP_URL)',
    ],
    env: {
      ...process.env,
      NEXT_PUBLIC_APP_URL: appUrl,
    },
    stderr: "pipe",
    stdout: "pipe",
  })
}

describe("application environment", () => {
  test("accepts the public application URL", () => {
    const result = importEnv("https://webpiano.xyz")

    expect(result.exitCode).toBe(0)
    expect(result.stdout.toString().trim()).toBe("https://webpiano.xyz")
  })

  test("rejects a malformed public application URL", () => {
    const result = importEnv("not-a-url")

    expect(result.exitCode).not.toBe(0)
  })
})
