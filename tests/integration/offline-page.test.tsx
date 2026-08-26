import { describe, expect, test } from "bun:test"

import { render, screen } from "@testing-library/react"

import * as OfflinePageModule from "@/app/~offline/page"

const OfflinePage = OfflinePageModule.default

describe("offline fallback", () => {
  test("keeps the connectivity fallback out of search results", () => {
    const { metadata } = OfflinePageModule as typeof OfflinePageModule & {
      metadata?: {
        alternates?: { canonical?: null }
        description?: string
        robots?: { follow?: boolean; index?: boolean }
        title?: string
      }
    }

    expect(metadata).toMatchObject({
      alternates: { canonical: null },
      description: "Reconnect to continue with webpiano.",
      robots: { follow: true, index: false },
      title: "Offline — webpiano",
    })
  })

  test("explains how to reconnect without a dead-end action", () => {
    render(<OfflinePage />)

    expect(screen.getByRole("heading", { level: 1, name: "You’re offline" })).toBeTruthy()
    expect(screen.getByText("Reconnect to continue with webpiano.")).toBeTruthy()
  })
})
