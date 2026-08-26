import { beforeEach, describe, expect, mock, test } from "bun:test"

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createTRPCClient, unstable_localLink } from "@trpc/client"

import { PedalRemote } from "@/components/pedal-remote"
import type { PedalPeerOptions, PedalPeerPort } from "@/lib/pedal-peer"
import type { PedalService } from "@/server/pedal/contracts"
import { createPedalRouter } from "@/server/pedal/router"
import type { AppRouter } from "@/server/pedal/router"
import { PedalApiProvider, makePedalQueryClient } from "@/trpc/client"

const SESSION_ID = "s".repeat(22)
const GUEST_TOKEN = "g".repeat(32)

function renderRemote({ failIce = false }: { failIce?: boolean } = {}) {
  const issueIceServers = mock(async () => ({
    iceServers: [{ urls: ["stun:stun.cloudflare.com:3478"] }],
    iceTransportPolicy: "all" as const,
    credentialExpiresAt: "2026-08-26T14:10:00.000Z",
  }))
  if (failIce) {
    issueIceServers.mockRejectedValueOnce(new Error("TURN unavailable"))
  }
  const service: PedalService = {
    createSession: mock(async () => {
      throw new Error("not used")
    }),
    issueIceServers,
    endSession: mock(async () => ({ ended: true as const })),
  }
  const router = createPedalRouter({ pedal: service })
  const client = createTRPCClient<AppRouter>({
    links: [unstable_localLink({ router, createContext: async () => ({ pedal: service }) })],
  })
  let peerOptions: PedalPeerOptions | undefined
  const peer: PedalPeerPort = {
    close: mock(() => {}),
    sendPedal: mock(() => true),
    start: mock(() => {}),
  }

  render(
    <PedalApiProvider client={client} queryClient={makePedalQueryClient()}>
      <PedalRemote
        sessionId={SESSION_ID}
        peerFactory={(options) => {
          peerOptions = options
          return peer
        }}
      />
    </PedalApiProvider>,
  )

  return { peer, service, getPeerOptions: () => peerOptions }
}

describe("PedalRemote", () => {
  beforeEach(() => {
    sessionStorage.clear()
    history.replaceState(null, "", `/pedal/${SESSION_ID}#${GUEST_TOKEN}`)
  })

  test("consumes the fragment capability and connects as the guest", async () => {
    const { peer, service, getPeerOptions } = renderRemote()

    await waitFor(() => expect(peer.start).toHaveBeenCalledTimes(1))

    expect(service.issueIceServers).toHaveBeenCalledWith({
      clientOrigin: window.location.origin,
      sessionId: SESSION_ID,
      role: "guest",
      token: GUEST_TOKEN,
    })
    expect(location.hash).toBe("")
    expect(sessionStorage.getItem(`webpiano:pedal:${SESSION_ID}`)).toBe(GUEST_TOKEN)
    expect(getPeerOptions()?.role).toBe("guest")
  })

  test("enables the full-screen pedal when the data channel opens", async () => {
    const { peer, getPeerOptions } = renderRemote()
    await waitFor(() => expect(getPeerOptions()).toBeDefined())

    act(() => getPeerOptions()?.onStatusChange?.("connected"))

    const pedal = screen.getByRole("button", { name: "Sustain pedal" })
    expect(pedal.getAttribute("disabled")).toBeNull()
    fireEvent.pointerDown(pedal, { pointerId: 5 })

    expect(peer.sendPedal).toHaveBeenLastCalledWith({ v: 1, type: "pedal", seq: 1, down: true })
  })

  test("keeps pedal message ordering across a reconnecting status transition", async () => {
    const { peer, getPeerOptions } = renderRemote()
    await waitFor(() => expect(getPeerOptions()).toBeDefined())
    act(() => getPeerOptions()?.onStatusChange?.("connected"))

    let pedal = screen.getByRole("button", { name: "Sustain pedal" })
    fireEvent.pointerDown(pedal, { pointerId: 5 })
    fireEvent.pointerUp(pedal, { pointerId: 5 })
    act(() => getPeerOptions()?.onStatusChange?.("reconnecting"))
    act(() => getPeerOptions()?.onStatusChange?.("connected"))

    pedal = screen.getByRole("button", { name: "Sustain pedal" })
    fireEvent.pointerDown(pedal, { pointerId: 6 })

    expect(peer.sendPedal).toHaveBeenLastCalledWith({ v: 1, type: "pedal", seq: 3, down: true })
  })

  test("reports service failures without claiming the link is invalid", async () => {
    renderRemote({ failIce: true })

    expect(
      await screen.findByText(
        "The pedal service is unavailable. Try creating a new code on your computer.",
      ),
    ).toBeTruthy()
  })
})
