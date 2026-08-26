import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "../..")

function read(path: string) {
  return readFileSync(join(root, path), "utf8")
}

describe("design contract", () => {
  test("self-hosts the display, body, and diagnostic typefaces", () => {
    const layout = read("src/app/layout.tsx")

    expect(layout).toContain("Cormorant_Garamond")
    expect(layout).toContain("Inter")
    expect(layout).toContain("Space_Mono")
    expect(layout).toContain('variable: "--font-heading"')
    expect(layout).toContain('variable: "--font-sans"')
    expect(layout).toContain('variable: "--font-mono"')
  })

  test("exposes piano materials as semantic theme tokens", () => {
    const styles = read("src/app/globals.css")

    expect(styles).toContain("--background: oklch(0.115")
    expect(styles).toContain("--foreground: oklch(0.94")
    expect(styles).toContain("--brass:")
    expect(styles).toContain("--ivory:")
    expect(styles).toContain("--lacquer:")
    expect(styles).toContain("--radius: 0.25rem")
  })

  test("keeps design decisions in the repository", () => {
    const design = read("docs/DESIGN.md")

    expect(design).toContain("## Tokens")
    expect(design).toContain("## Typography")
    expect(design).toContain("## Spacing")
    expect(design).toContain("## Components")
    expect(design).toContain("## Motion")
    expect(design).toContain("## Do / Don’t")
  })
})
