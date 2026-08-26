import { describe, expect, test } from "bun:test"

import manifest from "@/app/manifest"

describe("web app manifest", () => {
  test("describes an installable dark-first PWA", () => {
    const value = manifest()

    expect(value).toMatchObject({
      name: "webpiano",
      short_name: "webpiano",
      start_url: "/",
      display: "standalone",
      orientation: "landscape",
      background_color: "#11100f",
      theme_color: "#11100f",
    })
    expect(value.icons).toContainEqual({
      src: "/icons/icon-192.png",
      sizes: "192x192",
      type: "image/png",
    })
    expect(value.icons).toContainEqual({
      src: "/icons/icon-512.png",
      sizes: "512x512",
      type: "image/png",
    })
    expect(value.icons).toContainEqual({
      src: "/icons/icon-maskable-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    })
  })
})
