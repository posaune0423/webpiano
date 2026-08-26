import { describe, expect, test } from "bun:test"

import { render, screen } from "@testing-library/react"

import Home from "@/app/page"
import { PedalApiProvider } from "@/trpc/client"

describe("piano page", () => {
  test("opens directly into the playable instrument", () => {
    render(
      <PedalApiProvider>
        <Home />
      </PedalApiProvider>,
    )

    expect(screen.getByRole("heading", { level: 1, name: "webpiano" })).toBeTruthy()
    expect(screen.getByRole("group", { name: "Playable piano" })).toBeTruthy()
    expect(screen.getAllByRole("button", { name: /Play / })).toHaveLength(24)
    expect(screen.queryByText("Coming soon")).toBeNull()
    expect(screen.queryByRole("img", { name: "Glossy grand piano keys" })).toBeNull()
    expect(screen.getByRole("link", { name: "Terms" }).getAttribute("href")).toBe("/terms")
    expect(screen.getByRole("link", { name: "Privacy Policy" }).getAttribute("href")).toBe(
      "/privacy",
    )
  })
})
