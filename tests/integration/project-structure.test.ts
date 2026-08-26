import { describe, expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { Glob } from "bun"

const root = join(import.meta.dir, "../..")

function read(path: string) {
  return readFileSync(join(root, path), "utf8")
}

describe("project test structure", () => {
  test("keeps unit, integration, and end-to-end tests under tests", () => {
    const packageJson = JSON.parse(read("package.json")) as {
      scripts: Record<string, string>
    }

    expect(packageJson.scripts).toMatchObject({
      "test:unit": "bun test tests/unit",
      "test:integration": "bun test tests/integration",
      "test:e2e": "playwright test",
      "test:e2e:pwa": "playwright test --config playwright.pwa.config.ts",
    })
    expect(read("bunfig.toml")).toContain('"./tests/support/dom.ts"')
    expect(read("bunfig.toml")).toContain('"./tests/support/setup.ts"')
    expect(read("playwright.config.ts")).toContain('testDir: "./tests/e2e"')
    expect(read("playwright.pwa.config.ts")).toContain('testDir: "./tests/e2e"')
    expect(read("knip.json")).toContain('"tests/**/*.{ts,tsx}"')

    const testFiles = new Set<string>()
    for (const pattern of ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"]) {
      for (const path of new Glob(pattern).scanSync({ cwd: root, onlyFiles: true })) {
        if (![".next/", ".open-next/", "node_modules/"].some((prefix) => path.startsWith(prefix))) {
          testFiles.add(path)
        }
      }
    }

    expect([...testFiles].every((path) => path.startsWith("tests/"))).toBeTrue()
    expect(existsSync(join(root, "test"))).toBeFalse()
    expect(existsSync(join(root, "e2e"))).toBeFalse()
  })

  test("keeps the stable Next.js React Compiler enabled", () => {
    const packageJson = JSON.parse(read("package.json")) as {
      devDependencies: Record<string, string>
    }

    expect(read("next.config.ts")).toContain("reactCompiler: true")
    expect(packageJson.devDependencies["babel-plugin-react-compiler"]).toBe("1.0.0")
  })
})
