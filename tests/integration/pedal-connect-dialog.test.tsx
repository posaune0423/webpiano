import { describe, expect, mock, test } from "bun:test"

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createTRPCClient, unstable_localLink } from "@trpc/client"

import { PedalConnectDialog } from "@/components/pedal-connect-dialog"
import type { PedalPeerOptions, PedalPeerPort } from "@/lib/pedal-peer"
import type { PedalService } from "@/server/pedal/contracts"
import { createPedalRouter } from "@/server/pedal/router"
import type { AppRouter } from "@/server/pedal/router"
import { PedalApiProvider, makePedalQueryClient } from "@/trpc/client"

const SESSION_ID = "s".repeat(22)
const HOST_TOKEN = "h".repeat(32)
const GUEST_TOKEN = "g".repeat(32)
const JOIN_URL = `https://webpiano.xyz/pedal/${SESSION_ID}#${GUEST_TOKEN}`

function renderDialog({
  deferIce = false,
  deferSession = false,
  failFirstIce = false,
  open,
}: { deferIce?: boolean; deferSession?: boolean; failFirstIce?: boolean; open?: boolean } = {}) {
  const iceConfiguration = {
    iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
    iceTransportPolicy: "all" as const,
    credentialExpiresAt: "2026-08-26T14:10:00.000Z",
  }
  let resolveIce: (() => void) | undefined
  const deferredIce = new Promise<typeof iceConfiguration>((resolve) => {
    resolveIce = () => resolve(iceConfiguration)
  })
  const issueIceServers = mock(async () => (deferIce ? deferredIce : iceConfiguration))
  if (failFirstIce) {
    issueIceServers.mockRejectedValueOnce(new Error("temporary failure"))
  }
  const sessionOutput = {
    sessionId: SESSION_ID,
    hostToken: HOST_TOKEN,
    joinUrl: JOIN_URL,
    signalPath: `/api/pedal/sessions/${SESSION_ID}/signal`,
    pairingExpiresAt: "2026-08-26T12:10:00.000Z",
  }
  let resolveSession: (() => void) | undefined
  const deferredSession = new Promise<typeof sessionOutput>((resolve) => {
    resolveSession = () => resolve(sessionOutput)
  })
  const service: PedalService = {
    createSession: mock(async () => (deferSession ? deferredSession : sessionOutput)),
    issueIceServers,
    endSession: mock(async () => ({ ended: true as const })),
  }
  const router = createPedalRouter({ pedal: service })
  const client = createTRPCClient<AppRouter>({
    links: [unstable_localLink({ router, createContext: async () => ({ pedal: service }) })],
  })
  const queryClient = makePedalQueryClient()
  let peerOptions: PedalPeerOptions | undefined
  const peer: PedalPeerPort = {
    close: mock(() => {}),
    sendPedal: mock(() => false),
    start: mock(() => {}),
  }
  const peerFactory = (options: PedalPeerOptions) => {
    peerOptions = options
    return peer
  }
  const onPedalChange = mock(() => {})

  render(
    <PedalApiProvider client={client} queryClient={queryClient}>
      <PedalConnectDialog open={open} onPedalChange={onPedalChange} peerFactory={peerFactory} />
    </PedalApiProvider>,
  )

  return {
    onPedalChange,
    peer,
    resolveIce,
    resolveSession,
    service,
    getPeerOptions: () => peerOptions,
  }
}

describe("PedalConnectDialog", () => {
  test("starts a session when a parent controls the dialog open state", async () => {
    const { service } = renderDialog({ open: true })

    expect(await screen.findByTitle("QR code for phone pedal")).toBeTruthy()
    expect(service.createSession).toHaveBeenCalledTimes(1)
  })

  test("does not restart a controlled session after an explicit disconnect", async () => {
    const { getPeerOptions, service } = renderDialog({ open: true })

    await screen.findByTitle("QR code for phone pedal")
    await waitFor(() => expect(getPeerOptions()).toBeDefined())
    act(() => getPeerOptions()?.onStatusChange?.("connected"))
    fireEvent.click(await screen.findByRole("button", { name: "Disconnect" }))
    await waitFor(() => expect(service.endSession).toHaveBeenCalledTimes(1))

    expect(service.createSession).toHaveBeenCalledTimes(1)
  })

  test("keeps one fixed content slot while the QR session loads", async () => {
    const { resolveSession } = renderDialog({ deferSession: true })

    fireEvent.click(screen.getByRole("button", { name: "Use phone as pedal" }))
    await screen.findByRole("dialog")

    const loadingSlot = document.querySelector("[data-pedal-session-slot]")
    expect(loadingSlot).not.toBeNull()
    expect(loadingSlot?.getAttribute("data-state")).toBe("creating")
    expect(loadingSlot?.className).toContain("h-[26.25rem]")

    await act(async () => {
      resolveSession?.()
      await Promise.resolve()
    })
    await screen.findByTitle("QR code for phone pedal")

    const readySlot = document.querySelector("[data-pedal-session-slot]")
    expect(readySlot).toBe(loadingSlot)
    expect(readySlot?.getAttribute("data-state")).toBe("waiting")
    expect(readySlot?.className).toContain("h-[26.25rem]")
  })

  test("creates a typed session and shows a scannable pairing link", async () => {
    const { peer, service, getPeerOptions } = renderDialog()

    fireEvent.click(screen.getByRole("button", { name: "Use phone as pedal" }))

    expect(await screen.findByRole("dialog")).toBeTruthy()
    expect(await screen.findByTitle("QR code for phone pedal")).toBeTruthy()
    expect(
      screen.getByText(`${window.location.origin}/pedal/${SESSION_ID}#${GUEST_TOKEN}`),
    ).toBeTruthy()
    expect(service.createSession).toHaveBeenCalledTimes(1)
    expect(service.issueIceServers).toHaveBeenCalledWith({
      clientOrigin: window.location.origin,
      sessionId: SESSION_ID,
      role: "host",
      token: HOST_TOKEN,
    })
    await waitFor(() => expect(peer.start).toHaveBeenCalledTimes(1))
    expect(getPeerOptions()?.role).toBe("host")
  })

  test("closes pairing details after WebRTC connects while keeping disconnect available", async () => {
    const { getPeerOptions } = renderDialog()

    fireEvent.click(screen.getByRole("button", { name: "Use phone as pedal" }))
    await screen.findByTitle("QR code for phone pedal")
    await waitFor(() => expect(getPeerOptions()).toBeDefined())

    act(() => getPeerOptions()?.onStatusChange?.("connected"))

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(screen.getByRole("button", { name: "Phone pedal connected" })).toBeTruthy()
  })

  test("forwards remote pedal state from the peer to the piano", async () => {
    const { getPeerOptions, onPedalChange } = renderDialog()

    fireEvent.click(screen.getByRole("button", { name: "Use phone as pedal" }))
    await screen.findByTitle("QR code for phone pedal")
    await waitFor(() => expect(getPeerOptions()).toBeDefined())

    act(() => getPeerOptions()?.onPedalChange?.(true))

    expect(onPedalChange).toHaveBeenLastCalledWith(true)
  })

  test("creates a new session after a transient ICE failure", async () => {
    const { service } = renderDialog({ failFirstIce: true })

    fireEvent.click(screen.getByRole("button", { name: "Use phone as pedal" }))
    expect(await screen.findByText("Pedal unavailable")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Try again" }))

    await waitFor(() => expect(service.createSession).toHaveBeenCalledTimes(2))
  })

  test("does not start a peer when the dialog closes during ICE setup", async () => {
    const { peer, resolveIce } = renderDialog({ deferIce: true })

    fireEvent.click(screen.getByRole("button", { name: "Use phone as pedal" }))
    await screen.findByTitle("QR code for phone pedal")
    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())

    await act(async () => {
      resolveIce?.()
      await Promise.resolve()
    })

    expect(peer.start).not.toHaveBeenCalled()
  })
})
