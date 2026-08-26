import { describe, expect, test } from "bun:test"

import type { ReactElement } from "react"

import PedalPage from "@/app/pedal/[sessionId]/page"
import { PedalRemote } from "@/components/pedal-remote"

describe("pedal pairing page", () => {
  test("passes the paired session to the phone controller", async () => {
    const element = (await PedalPage({
      params: Promise.resolve({ sessionId: "s".repeat(22) }),
    })) as ReactElement<{ sessionId: string }>

    expect(element.type).toBe(PedalRemote)
    expect(element.props.sessionId).toBe("s".repeat(22))
  })
})
