import { describe, expect, test } from "bun:test"

import { render, screen } from "@testing-library/react"
import type { Metadata } from "next"
import type { ComponentType } from "react"

interface LegalPageModule {
  default: ComponentType
  metadata: Metadata
}

async function loadLegalPage(path: string) {
  return import(path).then((module) => module as LegalPageModule).catch(() => undefined)
}

describe("legal pages", () => {
  test("publishes concise terms of use", async () => {
    const terms = await loadLegalPage("../../src/app/terms/page.tsx")

    expect(terms).toBeDefined()
    if (!terms) return

    render(<terms.default />)

    expect(terms.metadata.title).toBe("Terms — webpiano")
    expect(terms.metadata.alternates).toEqual({ canonical: "/terms" })
    expect(terms.metadata.openGraph).toMatchObject({ title: "Terms — webpiano", url: "/terms" })
    expect(terms.metadata.twitter).toMatchObject({ title: "Terms — webpiano" })
    expect(screen.getByRole("heading", { level: 1, name: "Terms" })).toBeTruthy()
    expect(screen.getByText("Last updated: August 26, 2026")).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Acceptable use" })).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Availability" })).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Disclaimer" })).toBeTruthy()
    expect(screen.getByRole("link", { name: "Back to webpiano" }).getAttribute("href")).toBe("/")
    expect(screen.getByRole("link", { name: "Privacy Policy" }).getAttribute("href")).toBe(
      "/privacy",
    )
  })

  test("documents current privacy behavior", async () => {
    const privacy = await loadLegalPage("../../src/app/privacy/page.tsx")

    expect(privacy).toBeDefined()
    if (!privacy) return

    render(<privacy.default />)

    expect(privacy.metadata.title).toBe("Privacy Policy — webpiano")
    expect(privacy.metadata.alternates).toEqual({ canonical: "/privacy" })
    expect(privacy.metadata.openGraph).toMatchObject({
      title: "Privacy Policy — webpiano",
      url: "/privacy",
    })
    expect(privacy.metadata.twitter).toMatchObject({ title: "Privacy Policy — webpiano" })
    expect(screen.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeTruthy()
    expect(screen.getByText("Last updated: August 26, 2026")).toBeTruthy()
    expect(screen.getByText(/does not require an account/i)).toBeTruthy()
    expect(screen.getByText(/stay in your browser/i)).toBeTruthy()
    expect(screen.getByText(/WebRTC signaling is relayed/i)).toBeTruthy()
    expect(
      screen.getByText(/stored record is scheduled for deletion around the two-hour mark/i),
    ).toBeTruthy()
    expect(screen.getByText(/Cloudflare/i)).toBeTruthy()
    expect(screen.getByRole("link", { name: "Back to webpiano" }).getAttribute("href")).toBe("/")
    expect(screen.getByRole("link", { name: "Terms" }).getAttribute("href")).toBe("/terms")
  })
})
