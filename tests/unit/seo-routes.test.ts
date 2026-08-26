import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import type { MetadataRoute } from "next"

const root = join(import.meta.dir, "../..")
const productionUrl = "https://webpiano.xyz"
let originalAppUrl: string | undefined

beforeEach(() => {
  originalAppUrl = process.env.NEXT_PUBLIC_APP_URL
})

afterEach(() => {
  if (originalAppUrl === undefined) {
    delete process.env.NEXT_PUBLIC_APP_URL
    return
  }

  process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
})

async function loadMetadataRoute<T>(relativePath: string, modulePath: string): Promise<T> {
  expect(existsSync(join(root, relativePath))).toBeTrue()
  return (await import(modulePath)) as T
}

describe("SEO metadata routes", () => {
  test("publishes a concise agent-facing project index", () => {
    const llmsPath = join(root, "public/llms.txt")

    expect(existsSync(llmsPath)).toBeTrue()
    const llms = readFileSync(llmsPath, "utf8")
    expect(llms).toContain("# webpiano")
    expect(llms).toContain("https://webpiano.xyz")
    expect(llms).toContain("https://webpiano.xyz/privacy")
    expect(llms).toContain("https://webpiano.xyz/terms")
    expect(llms).not.toContain("/pedal/")
    expect(llms).not.toContain("/~offline")
  })

  test("describes the social image for assistive sharing clients", () => {
    const altPath = join(root, "src/app/opengraph-image.alt.txt")

    expect(existsSync(altPath)).toBeTrue()
    expect(readFileSync(altPath, "utf8").trim()).toBe(
      "webpiano online piano played with a computer keyboard",
    )
  })

  test("publishes an explicit crawl policy and sitemap location", async () => {
    process.env.NEXT_PUBLIC_APP_URL = productionUrl
    const { default: robots } = await loadMetadataRoute<{
      default: () => MetadataRoute.Robots
    }>("src/app/robots.ts", "@/app/robots")

    expect(robots()).toEqual({
      host: productionUrl,
      rules: {
        allow: "/",
        disallow: "/api/",
        userAgent: "*",
      },
      sitemap: `${productionUrl}/sitemap.xml`,
    })
  })

  test("lists only canonical pages intended for indexing", async () => {
    process.env.NEXT_PUBLIC_APP_URL = productionUrl
    const { default: sitemap } = await loadMetadataRoute<{
      default: () => MetadataRoute.Sitemap
    }>("src/app/sitemap.ts", "@/app/sitemap")

    expect(sitemap()).toEqual([
      { url: productionUrl },
      { url: `${productionUrl}/privacy` },
      { url: `${productionUrl}/terms` },
    ])
  })
})
