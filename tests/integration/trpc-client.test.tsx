import { describe, expect, test } from "bun:test"

import { render, screen } from "@testing-library/react"

import { PedalApiProvider, makePedalQueryClient } from "@/trpc/client"

describe("PedalApiProvider", () => {
  test("renders its application children inside the typed API providers", () => {
    render(
      <PedalApiProvider>
        <span>Instrument ready</span>
      </PedalApiProvider>,
    )

    expect(screen.getByText("Instrument ready")).toBeTruthy()
  })

  test("does not retry short-lived pedal API operations", () => {
    const queryClient = makePedalQueryClient()

    expect(queryClient.getDefaultOptions().mutations?.retry).toBeFalse()
    expect(queryClient.getDefaultOptions().queries?.retry).toBeFalse()
  })
})
