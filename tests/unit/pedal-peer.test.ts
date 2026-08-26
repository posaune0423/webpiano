import { describe, expect, mock, test } from "bun:test"

import { PedalPeer } from "@/lib/pedal-peer"
import type { DataChannelPort, PeerConnectionPort, SignalSocketPort } from "@/lib/pedal-peer"

class FakeDataChannel implements DataChannelPort {
  onclose: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onopen: (() => void) | null = null
  readyState: RTCDataChannelState = "connecting"
  sent: string[] = []

  close() {
    this.readyState = "closed"
    this.onclose?.()
  }

  open() {
    this.readyState = "open"
    this.onopen?.()
  }

  receive(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) })
  }

  send(data: string) {
    this.sent.push(data)
  }
}

class FakePeerConnection implements PeerConnectionPort {
  connectionState: RTCPeerConnectionState = "new"
  readonly dataChannel = new FakeDataChannel()
  onconnectionstatechange: (() => void) | null = null
  ondatachannel: ((event: { channel: DataChannelPort }) => void) | null = null
  onicecandidate: ((event: { candidate: RTCIceCandidate | null }) => void) | null = null
  readonly createOffer = mock(async () => ({ type: "offer" as const, sdp: "host-offer" }))
  readonly createAnswer = mock(async () => ({ type: "answer" as const, sdp: "guest-answer" }))
  readonly setLocalDescription = mock(async (_description: RTCSessionDescriptionInit) => {})
  readonly setRemoteDescription = mock(async (_description: RTCSessionDescriptionInit) => {})
  readonly addIceCandidate = mock(async (_candidate: RTCIceCandidateInit) => {})
  readonly restartIce = mock(() => {})

  close() {
    this.connectionState = "closed"
  }

  createDataChannel() {
    return this.dataChannel
  }
}

class FakeSignalSocket implements SignalSocketPort {
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onopen: (() => void) | null = null
  readyState = 0
  sent: string[] = []

  close() {
    this.readyState = 3
    this.onclose?.()
  }

  open() {
    this.readyState = 1
    this.onopen?.()
  }

  receive(message: unknown) {
    this.onmessage?.({ data: JSON.stringify(message) })
  }

  send(data: string) {
    this.sent.push(data)
  }
}

async function flushPromises() {
  for (let index = 0; index < 10; index += 1) {
    await Promise.resolve()
  }
}

describe("PedalPeer", () => {
  test("waits for both peers before the host creates an offer", async () => {
    const socket = new FakeSignalSocket()
    const connection = new FakePeerConnection()
    const peer = new PedalPeer({
      role: "host",
      sessionId: "session",
      signalPath: "/api/pedal/sessions/session/signal",
      token: "host-token",
      iceConfiguration: { iceServers: [], iceTransportPolicy: "all" },
      createPeerConnection: () => connection,
      createSignalSocket: () => socket,
    })

    peer.start()
    socket.open()
    socket.receive({ v: 1, type: "peer-state", state: "waiting" })
    await flushPromises()

    expect(connection.createOffer).not.toHaveBeenCalled()
    expect(JSON.parse(socket.sent[0] ?? "{}")).toEqual({
      v: 1,
      type: "hello",
      role: "host",
      token: "host-token",
    })

    socket.receive({ v: 1, type: "peer-state", state: "ready" })
    await flushPromises()

    expect(connection.createOffer).toHaveBeenCalledTimes(1)
    expect(connection.setLocalDescription).toHaveBeenCalledWith({
      type: "offer",
      sdp: "host-offer",
    })
    expect(JSON.parse(socket.sent.at(-1) ?? "{}")).toEqual({
      v: 1,
      type: "offer",
      sdp: "host-offer",
    })
  })

  test("answers a host offer as the guest", async () => {
    const socket = new FakeSignalSocket()
    const connection = new FakePeerConnection()
    const peer = new PedalPeer({
      role: "guest",
      sessionId: "session",
      signalPath: "/api/pedal/sessions/session/signal",
      token: "guest-token",
      iceConfiguration: { iceServers: [], iceTransportPolicy: "all" },
      createPeerConnection: () => connection,
      createSignalSocket: () => socket,
    })

    peer.start()
    socket.open()
    socket.receive({ v: 1, type: "offer", sdp: "host-offer" })
    await flushPromises()

    expect(connection.setRemoteDescription).toHaveBeenCalledWith({
      type: "offer",
      sdp: "host-offer",
    })
    expect(connection.createAnswer).toHaveBeenCalledTimes(1)
    expect(JSON.parse(socket.sent.at(-1) ?? "{}")).toEqual({
      v: 1,
      type: "answer",
      sdp: "guest-answer",
    })
  })

  test("processes signaling messages in arrival order", async () => {
    const socket = new FakeSignalSocket()
    const connection = new FakePeerConnection()
    let finishRemoteDescription: (() => void) | undefined
    const remoteDescriptionPending = new Promise<void>((resolve) => {
      finishRemoteDescription = resolve
    })
    connection.setRemoteDescription.mockImplementation(async () => remoteDescriptionPending)
    const peer = new PedalPeer({
      role: "guest",
      sessionId: "session",
      signalPath: "/api/pedal/sessions/session/signal",
      token: "guest-token",
      iceConfiguration: { iceServers: [], iceTransportPolicy: "all" },
      createPeerConnection: () => connection,
      createSignalSocket: () => socket,
    })

    peer.start()
    socket.open()
    socket.receive({ v: 1, type: "offer", sdp: "host-offer" })
    socket.receive({
      v: 1,
      type: "ice",
      candidate: { candidate: "candidate:1 1 udp 1 127.0.0.1 9 typ host" },
    })
    await flushPromises()

    expect(connection.addIceCandidate).not.toHaveBeenCalled()

    finishRemoteDescription?.()
    await flushPromises()
    await flushPromises()

    expect(connection.addIceCandidate).toHaveBeenCalledTimes(1)
  })

  test("delivers validated pedal state to the host and releases it on close", () => {
    const socket = new FakeSignalSocket()
    const connection = new FakePeerConnection()
    const onPedalChange = mock(() => {})
    const peer = new PedalPeer({
      role: "host",
      sessionId: "session",
      signalPath: "/api/pedal/sessions/session/signal",
      token: "host-token",
      iceConfiguration: { iceServers: [], iceTransportPolicy: "all" },
      onPedalChange,
      createPeerConnection: () => connection,
      createSignalSocket: () => socket,
    })

    peer.start()
    connection.dataChannel.open()
    connection.dataChannel.receive({ v: 1, type: "pedal", seq: 1, down: true })

    expect(onPedalChange).toHaveBeenLastCalledWith(true)

    peer.close()

    expect(onPedalChange).toHaveBeenLastCalledWith(false)
  })

  test("sends pedal messages only through an open guest data channel", () => {
    const socket = new FakeSignalSocket()
    const connection = new FakePeerConnection()
    const peer = new PedalPeer({
      role: "guest",
      sessionId: "session",
      signalPath: "/api/pedal/sessions/session/signal",
      token: "guest-token",
      iceConfiguration: { iceServers: [], iceTransportPolicy: "all" },
      createPeerConnection: () => connection,
      createSignalSocket: () => socket,
    })

    peer.start()
    connection.ondatachannel?.({ channel: connection.dataChannel })
    connection.dataChannel.open()

    expect(peer.sendPedal({ v: 1, type: "pedal", seq: 1, down: true })).toBeTrue()
    expect(JSON.parse(connection.dataChannel.sent[0] ?? "{}")).toEqual({
      v: 1,
      type: "pedal",
      seq: 1,
      down: true,
    })
  })

  test("allows another ICE restart after a connection recovery", async () => {
    const socket = new FakeSignalSocket()
    const connection = new FakePeerConnection()
    const peer = new PedalPeer({
      role: "host",
      sessionId: "session",
      signalPath: "/api/pedal/sessions/session/signal",
      token: "host-token",
      iceConfiguration: { iceServers: [], iceTransportPolicy: "all" },
      createPeerConnection: () => connection,
      createSignalSocket: () => socket,
    })
    peer.start()
    socket.open()

    connection.connectionState = "failed"
    connection.onconnectionstatechange?.()
    await flushPromises()
    connection.connectionState = "connected"
    connection.onconnectionstatechange?.()
    connection.connectionState = "failed"
    connection.onconnectionstatechange?.()
    await flushPromises()

    expect(connection.restartIce).toHaveBeenCalledTimes(2)
  })
})
