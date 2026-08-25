import { describe, expect, test } from "bun:test"
import { readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { imageSize } from "image-size"

const root = join(import.meta.dir, "..")

interface AssetExpectation {
  format: string
  height: number
  maxBytes: number
  path: string
  width: number
}

const assets: AssetExpectation[] = [
  {
    path: "public/brand/piano-keys-hero.webp",
    width: 1536,
    height: 1024,
    format: "webp",
    maxBytes: 700_000,
  },
  {
    path: "src/app/opengraph-image.jpg",
    width: 1200,
    height: 630,
    format: "jpg",
    maxBytes: 500_000,
  },
  {
    path: "public/brand/piano-keys-icon.png",
    width: 1024,
    height: 1024,
    format: "png",
    maxBytes: 200_000,
  },
  {
    path: "src/app/icon.png",
    width: 512,
    height: 512,
    format: "png",
    maxBytes: 200_000,
  },
  {
    path: "src/app/apple-icon.png",
    width: 180,
    height: 180,
    format: "png",
    maxBytes: 200_000,
  },
  {
    path: "public/icons/icon-192.png",
    width: 192,
    height: 192,
    format: "png",
    maxBytes: 200_000,
  },
  {
    path: "public/icons/icon-512.png",
    width: 512,
    height: 512,
    format: "png",
    maxBytes: 200_000,
  },
  {
    path: "public/icons/icon-maskable-512.png",
    width: 512,
    height: 512,
    format: "png",
    maxBytes: 200_000,
  },
]

describe("brand assets", () => {
  for (const asset of assets) {
    test(`${asset.path} matches its delivery contract`, () => {
      const absolutePath = join(root, asset.path)
      const dimensions = imageSize(readFileSync(absolutePath))

      expect(dimensions).toMatchObject({
        width: asset.width,
        height: asset.height,
        type: asset.format,
      })
      expect(statSync(absolutePath).size).toBeLessThanOrEqual(asset.maxBytes)
    })
  }

  test("keeps both selected ImageGen masters inside the project", () => {
    for (const path of [
      "assets/brand/masters/piano-keys-hero-master.png",
      "assets/brand/masters/piano-keys-icon-master.png",
    ]) {
      expect(statSync(join(root, path)).size).toBeGreaterThan(0)
    }
  })
})
