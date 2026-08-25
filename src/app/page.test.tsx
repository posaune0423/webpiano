import { describe, expect, test } from "bun:test"

import { render, screen } from "@testing-library/react"

import Home from "./page"

describe("piano page", () => {
  test("opens directly into the playable instrument", () => {
    render(<Home />)

    expect(screen.getByRole("heading", { level: 1, name: "webpiano" })).toBeTruthy()
    expect(screen.getByRole("group", { name: "Playable piano" })).toBeTruthy()
    expect(screen.getAllByRole("button", { name: /Play / })).toHaveLength(24)
    expect(screen.queryByText("Coming soon")).toBeNull()
    expect(screen.queryByRole("img", { name: "Glossy grand piano keys" })).toBeNull()
  })
})
