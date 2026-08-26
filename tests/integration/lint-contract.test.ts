import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

interface OxlintConfig {
  jsPlugins: Array<string | { name: string; specifier: string }>
  options: { typeAware: boolean }
  plugins: string[]
  rules: Record<string, unknown>
}

const root = join(import.meta.dir, "../..")
const config = JSON.parse(readFileSync(join(root, ".oxlintrc.json"), "utf8")) as OxlintConfig

describe("Oxlint contract", () => {
  test("enables every native plugin used by the shared ruleset", () => {
    const expectedPlugins = [
      "eslint",
      "typescript",
      "unicorn",
      "oxc",
      "import",
      "react",
      "jsx-a11y",
      "nextjs",
      "promise",
      "node",
    ]

    for (const plugin of expectedPlugins) {
      expect(config.plugins).toContain(plugin)
    }
    expect(config.options.typeAware).toBeTrue()
  })

  test("preserves the highest-value import, TypeScript, React, and Next rules", () => {
    expect(config.rules).toMatchObject({
      "import/consistent-type-specifier-style": ["error", "prefer-top-level"],
      "typescript/consistent-type-imports": [
        "error",
        expect.objectContaining({ fixStyle: "separate-type-imports" }),
      ],
      "typescript/no-explicit-any": "error",
      "typescript/no-floating-promises": "error",
      "typescript/no-unnecessary-condition": "error",
      "typescript/no-unsafe-member-access": "error",
      "typescript/switch-exhaustiveness-check": "error",
      "react/rules-of-hooks": "error",
      "react/exhaustive-deps": "warn",
      "react/immutability": "error",
      "react/purity": "error",
      "react/refs": "error",
      "react/set-state-in-effect": "error",
      "react/static-components": "error",
      "unicorn/filename-case": ["error", { case: "kebabCase" }],
      "nextjs/no-img-element": "warn",
      "jsx-a11y/alt-text": "error",
    })
  })

  test("retains only the JavaScript plugin that does not pull in ESLint", () => {
    expect(config.jsPlugins).toEqual([{ name: "security", specifier: "eslint-plugin-security" }])
  })

  test("uses native React rules for the enforceable effect guidance", () => {
    expect(config.jsPlugins).not.toContainEqual(
      expect.objectContaining({ name: "react-you-might-not-need-an-effect" }),
    )
    expect(config.rules["react/set-state-in-effect"]).toBe("error")
    expect(config.rules["react/exhaustive-deps"]).toBe("warn")
  })
})
