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

  test("crossfades route content while respecting reduced motion", () => {
    const layout = read("src/app/layout.tsx")
    const styles = read("src/app/globals.css")

    expect(layout).toContain('ViewTransition name="crossfade"')
    expect(styles).toContain("::view-transition-old(crossfade)")
    expect(styles).toContain("::view-transition-new(crossfade)")
    expect(styles).toContain("filter: blur(4px)")
    expect(styles).toContain(
      "animation: 400ms cubic-bezier(0.6, 0, 0.8, 1) forwards crossfade-hide",
    )
    expect(styles).toContain("animation: 600ms 200ms forwards crossfade-appear")
    expect(styles).toContain("@media not (prefers-reduced-motion: reduce)")
    expect(styles).toContain("::view-transition {\n  pointer-events: none;")
    expect(styles).toContain("::view-transition-group(*),")
    expect(styles).toContain("::view-transition-old(*),")
    expect(styles).toContain("::view-transition-new(*)")
  })
})
