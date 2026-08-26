import { describe, expect, test } from "bun:test"

import type { ReactElement } from "react"

import * as PedalPageModule from "@/app/pedal/[sessionId]/page"
import { PedalRemote } from "@/components/pedal-remote"

const PedalPage = PedalPageModule.default

describe("pedal pairing page", () => {
  test("keeps temporary pairing sessions out of search results", () => {
    const { metadata } = PedalPageModule as typeof PedalPageModule & {
      metadata?: {
        alternates?: { canonical?: null }
        description?: string
        robots?: { follow?: boolean; index?: boolean }
        title?: string
      }
    }

    expect(metadata).toMatchObject({
      alternates: { canonical: null },
      description: "Use this phone as a temporary sustain pedal for webpiano.",
      robots: { follow: true, index: false },
      title: "Phone Pedal — webpiano",
    })
  })

  test("passes the paired session to the phone controller", async () => {
    const element = (await PedalPage({
      params: Promise.resolve({ sessionId: "s".repeat(22) }),
    })) as ReactElement<{ sessionId: string }>

    expect(element.type).toBe(PedalRemote)
    expect(element.props.sessionId).toBe("s".repeat(22))
  })
})
