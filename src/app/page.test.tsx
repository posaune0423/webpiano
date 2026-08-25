import { describe, expect, test } from "bun:test"

import { render, screen } from "@testing-library/react"

import Home from "./page"

describe("landing page", () => {
  test("introduces webpiano without advertising unfinished features", () => {
    render(<Home />)

    expect(screen.getByRole("heading", { level: 1, name: "webpiano" })).toBeTruthy()
    expect(screen.getByText("Play anywhere with your portable piano.")).toBeTruthy()
    expect(screen.getByText("Coming soon")).toBeTruthy()
    expect(screen.getByRole("img", { name: "Glossy grand piano keys" })).toBeTruthy()
    expect(screen.queryByRole("link")).toBeNull()
    expect(screen.queryByRole("button")).toBeNull()
  })
})
