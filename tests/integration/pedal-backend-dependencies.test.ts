import { expect, test } from "bun:test"

import packageJson from "../../package.json"

test("declares the type-safe pedal API dependencies", () => {
  expect(packageJson.dependencies).toMatchObject({
    "@tanstack/react-query": "5.102.4",
    "@trpc/client": "11.18.0",
    "@trpc/server": "11.18.0",
    "@trpc/tanstack-react-query": "11.18.0",
  })
})
