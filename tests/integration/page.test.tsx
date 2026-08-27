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

    expect(screen.getByRole("heading", { level: 1, name: "webpiano Online piano" })).toBeTruthy()
    expect(
      screen.getByText(
        "Play this free online piano with your computer keyboard or touch. No download or sign-up.",
      ),
    ).toBeTruthy()
    expect(screen.getByRole("group", { name: "Playable piano" })).toBeTruthy()
    expect(screen.getAllByRole("button", { name: /Play / })).toHaveLength(32)
    expect(screen.queryByText("Coming soon")).toBeNull()
    expect(screen.queryByRole("img", { name: "Glossy grand piano keys" })).toBeNull()
    const structuredData = document.querySelector('script[type="application/ld+json"]')
    expect(structuredData).not.toBeNull()
    expect(JSON.parse(structuredData?.textContent ?? "null")).toMatchObject({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      isAccessibleForFree: true,
      name: "webpiano",
      url: "https://webpiano.xyz",
    })
    expect(screen.getByRole("link", { name: "Terms" }).getAttribute("href")).toBe("/terms")
    expect(screen.getByRole("link", { name: "Privacy Policy" }).getAttribute("href")).toBe(
      "/privacy",
    )
  })
})
