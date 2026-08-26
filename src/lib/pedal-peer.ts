import * as v from "valibot"

import { pedalStateMessageSchema, signalMessageSchema } from "./pedal-protocol"
import type { IceConfiguration, PedalStateMessage, SignalMessage } from "./pedal-protocol"
import { RemotePedalState } from "./pedal-state"

export interface DataChannelPort {
  onclose: (() => void) | null
  onmessage: ((event: { data: string }) => void) | null
  onopen: (() => void) | null
  readyState: RTCDataChannelState
  close: () => void
  send: (data: string) => void
}

export interface PeerConnectionPort {
  connectionState: RTCPeerConnectionState
  onconnectionstatechange: (() => void) | null
  ondatachannel: ((event: { channel: DataChannelPort }) => void) | null
  onicecandidate: ((event: { candidate: RTCIceCandidate | null }) => void) | null
  addIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>
  close: () => void
  createAnswer: () => Promise<RTCSessionDescriptionInit>
  createDataChannel: (label: string) => DataChannelPort
  createOffer: () => Promise<RTCSessionDescriptionInit>
  restartIce: () => void
  setLocalDescription: (description: RTCSessionDescriptionInit) => Promise<void>
  setRemoteDescription: (description: RTCSessionDescriptionInit) => Promise<void>
}

export interface SignalSocketPort {
  onclose: (() => void) | null
  onerror: (() => void) | null
  onmessage: ((event: { data: string }) => void) | null
  onopen: (() => void) | null
  readyState: number
  close: () => void
  send: (data: string) => void
}

export interface PedalPeerOptions {
  createPeerConnection?: (configuration: RTCConfiguration) => PeerConnectionPort
  createSignalSocket?: (url: string) => SignalSocketPort
  iceConfiguration: IceConfiguration
  onPedalChange?: (down: boolean) => void
  onStatusChange?: (status: PedalPeerStatus) => void
  role: "host" | "guest"
  sessionId: string
  signalPath: string
  token: string
}

export type PedalPeerStatus = "connecting" | "connected" | "reconnecting" | "failed" | "closed"

export interface PedalPeerPort {
  close: () => void
  sendPedal: (message: PedalStateMessage) => boolean
  start: () => void
}

export class PedalPeer implements PedalPeerPort {
  private channel: DataChannelPort | undefined
  private closed = false
  private connection: PeerConnectionPort | undefined
  private deadmanTimer: number | undefined
  private offerInFlight = false
  private readonly remoteState = new RemotePedalState(750)
  private restartedIce = false
  private signalQueue: Promise<void> = Promise.resolve()
  private socket: SignalSocketPort | undefined

  constructor(private readonly options: PedalPeerOptions) {}

  close(): void {
    if (this.closed) {
      return
    }

    this.closed = true
    if (this.deadmanTimer !== undefined) {
      window.clearInterval(this.deadmanTimer)
    }
    this.deadmanTimer = undefined
    this.releaseRemotePedal()
    this.channel?.close()
    this.connection?.close()
    this.socket?.close()
    this.options.onStatusChange?.("closed")
  }

  sendPedal(message: PedalStateMessage): boolean {
    if (this.options.role !== "guest" || this.channel?.readyState !== "open") {
      return false
    }

    this.channel.send(JSON.stringify(message))
    return true
  }

  start(): void {
    if (this.connection || this.socket) {
      return
    }

    const createPeerConnection =
      this.options.createPeerConnection ??
      ((configuration: RTCConfiguration) =>
        new RTCPeerConnection(configuration) as unknown as PeerConnectionPort)
    const createSignalSocket =
      this.options.createSignalSocket ??
      ((url: string) => new WebSocket(url) as unknown as SignalSocketPort)

    this.connection = createPeerConnection({
      iceServers: this.options.iceConfiguration.iceServers,
      iceTransportPolicy: this.options.iceConfiguration.iceTransportPolicy,
    })
    this.connection.onicecandidate = (event) => {
      if (event.candidate) {
        const candidate = event.candidate.toJSON()
        if (candidate.candidate) {
          this.sendSignal({
            v: 1,
            type: "ice",
            candidate: {
              candidate: candidate.candidate,
              sdpMid: candidate.sdpMid,
              sdpMLineIndex: candidate.sdpMLineIndex,
              usernameFragment: candidate.usernameFragment ?? undefined,
            },
          })
        }
      }
    }
    this.connection.onconnectionstatechange = () => this.handleConnectionState()

    if (this.options.role === "host") {
      this.bindChannel(this.connection.createDataChannel("pedal-v1"))
    } else {
      this.connection.ondatachannel = (event) => this.bindChannel(event.channel)
    }

    this.socket = createSignalSocket(this.getSignalUrl())
    this.socket.onopen = () => {
      this.sendSignal({
        v: 1,
        type: "hello",
        role: this.options.role,
        token: this.options.token,
      })
    }
    this.socket.onmessage = (event) => {
      this.signalQueue = this.signalQueue
        .then(async () => this.handleSignalMessage(event.data))
        .catch(() => {
          if (!this.closed) {
            this.releaseRemotePedal()
            this.options.onStatusChange?.("failed")
          }
        })
    }
    this.socket.onerror = () => this.options.onStatusChange?.("failed")
    this.socket.onclose = () => {
      if (!this.closed && this.channel?.readyState !== "open") {
        this.releaseRemotePedal()
        this.options.onStatusChange?.("failed")
      }
    }
    this.options.onStatusChange?.("connecting")
  }

  private bindChannel(channel: DataChannelPort) {
    this.channel = channel
    channel.onopen = () => {
      this.options.onStatusChange?.("connected")
      if (this.options.role === "host" && this.deadmanTimer === undefined) {
        this.deadmanTimer = window.setInterval(() => {
          const next = this.remoteState.expire(Date.now())
          if (next === false) {
            this.options.onPedalChange?.(false)
          }
        }, 250)
      }
    }
    channel.onmessage = (event) => this.handlePedalMessage(event.data)
    channel.onclose = () => {
      this.releaseRemotePedal()
      if (!this.closed) {
        this.options.onStatusChange?.("reconnecting")
      }
    }
  }

  private getSignalUrl() {
    const base = typeof window === "undefined" ? "http://localhost" : window.location.href
    const url = new URL(this.options.signalPath, base)
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
    return url.toString()
  }

  private async handleSignalMessage(data: string) {
    if (this.closed) {
      return
    }

    let decoded: unknown
    try {
      decoded = JSON.parse(data)
    } catch {
      return
    }
    const parsed = v.safeParse(signalMessageSchema, decoded)
    if (!parsed.success || !this.connection) {
      return
    }
    const signal = parsed.output

    switch (signal.type) {
      case "peer-state":
        if (signal.state === "ready" && this.options.role === "host") {
          await this.createHostOffer()
        }
        return
      case "offer":
        if (this.options.role !== "guest") {
          return
        }
        await this.connection.setRemoteDescription({ type: "offer", sdp: signal.sdp })
        {
          const answer = await this.connection.createAnswer()
          await this.connection.setLocalDescription(answer)
          if (answer.sdp) {
            this.sendSignal({ v: 1, type: "answer", sdp: answer.sdp })
          }
        }
        return
      case "answer":
        if (this.options.role === "host") {
          await this.connection.setRemoteDescription({ type: "answer", sdp: signal.sdp })
        }
        return
      case "ice":
        await this.connection.addIceCandidate(signal.candidate)
        return
      case "close":
        this.close()
        return
      case "hello":
        return
    }
  }

  private async createHostOffer() {
    if (!this.connection || this.offerInFlight) {
      return
    }

    this.offerInFlight = true
    try {
      const offer = await this.connection.createOffer()
      await this.connection.setLocalDescription(offer)
      if (offer.sdp) {
        this.sendSignal({ v: 1, type: "offer", sdp: offer.sdp })
      }
    } finally {
      this.offerInFlight = false
    }
  }

  private handleConnectionState() {
    const state = this.connection?.connectionState
    if (state === "failed") {
      this.releaseRemotePedal()
      if (this.options.role === "host" && !this.restartedIce) {
        this.restartedIce = true
        this.connection?.restartIce()
        this.options.onStatusChange?.("reconnecting")
        void this.createHostOffer()
      } else {
        this.options.onStatusChange?.("failed")
      }
    } else if (state === "disconnected") {
      this.options.onStatusChange?.("reconnecting")
    } else if (state === "connected") {
      this.restartedIce = false
      this.options.onStatusChange?.("connected")
    }
  }

  private handlePedalMessage(data: string) {
    if (this.options.role !== "host") {
      return
    }

    let decoded: unknown
    try {
      decoded = JSON.parse(data)
    } catch {
      return
    }
    const parsed = v.safeParse(pedalStateMessageSchema, decoded)
    if (!parsed.success) {
      return
    }
    const next = this.remoteState.accept(parsed.output, Date.now())
    if (next !== undefined) {
      this.options.onPedalChange?.(next)
    }
  }

  private releaseRemotePedal() {
    if (this.remoteState.reset() === false) {
      this.options.onPedalChange?.(false)
    }
  }

  private sendSignal(message: SignalMessage) {
    if (this.socket?.readyState === 1) {
      this.socket.send(JSON.stringify(message))
    }
  }
}
