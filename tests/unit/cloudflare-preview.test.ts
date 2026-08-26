import { describe, expect, test } from "bun:test"

function previewUrl(branch: string) {
  return Bun.spawnSync(["bun", "scripts/deploy-cloudflare-preview.ts", "--print-url", branch])
}

function deploymentCommand(branch: string) {
  return Bun.spawnSync(["bun", "scripts/deploy-cloudflare.ts", "--print-command"], {
    env: { ...process.env, WORKERS_CI_BRANCH: branch },
  })
}

describe("Cloudflare branch preview", () => {
  test("derives a stable workers.dev URL from the branch name", () => {
    const result = previewUrl("Feature/Dual_Range")

    expect(result.exitCode).toBe(0)
    expect(result.stdout.toString().trim()).toBe(
      "https://webpiano-pr-feature-dual-range.yamadaasuma.workers.dev",
    )
  })

  test("keeps the Worker name inside the DNS label limit", () => {
    const result = previewUrl(`feature/${"very-long-branch-name-".repeat(8)}`)

    expect(result.exitCode).toBe(0)
    const url = new URL(result.stdout.toString().trim())
    expect(url.hostname.split(".")[0]?.length).toBeLessThanOrEqual(63)
  })

  test("places the temporary Wrangler config beside the project config", () => {
    const result = Bun.spawnSync([
      "bun",
      "scripts/deploy-cloudflare-preview.ts",
      "--print-config-path",
      "feature/preview",
    ])

    expect(result.exitCode).toBe(0)
    expect(result.stdout.toString().trim().startsWith(`${process.cwd()}/`)).toBeTrue()
  })

  test("keeps main on the production deploy and routes other branches to previews", () => {
    expect(deploymentCommand("main").stdout.toString().trim()).toBe(
      "bunx opennextjs-cloudflare deploy",
    )
    expect(deploymentCommand("feature/preview").stdout.toString().trim()).toBe(
      "bun scripts/deploy-cloudflare-preview.ts",
    )
  })
})
