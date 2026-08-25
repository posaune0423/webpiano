import { describe, expect, test } from "bun:test"

import { render, screen } from "@testing-library/react"

import OfflinePage from "./page"

describe("offline fallback", () => {
  test("explains how to reconnect without a dead-end action", () => {
    render(<OfflinePage />)

    expect(screen.getByRole("heading", { level: 1, name: "You’re offline" })).toBeTruthy()
    expect(screen.getByText("Reconnect to continue with webpiano.")).toBeTruthy()
  })
})
