import * as v from "valibot"

import { signalMessageSchema } from "@/lib/pedal-protocol"
import type { SignalMessage } from "@/lib/pedal-protocol"

import { PedalSessionState, PedalSessionStateError } from "./pedal-session-state"
import type {
  NewPedalSessionRecord,
  PedalParticipantRole,
  PedalSessionRecord,
} from "./pedal-session-state"

/* oxlint-disable typescript/method-signature-style, typescript/no-unnecessary-type-assertion */

const SESSION_KEY = "pedal-session"
const SESSION_ALARM_DELAY_MS = 2 * 60 * 60 * 1_000
const MAX_SIGNAL_BYTES = 64 * 1_024
const MAX_SIGNAL_MESSAGES_PER_MINUTE = 120

interface HibernatingWebSocket extends WebSocket {
  deserializeAttachment(): unknown
  serializeAttachment(value: unknown): void
}

interface PedalStorage {
  deleteAll(): Promise<void>
  get<T>(key: string): Promise<T | undefined>
  put<T>(key: string, value: T): Promise<void>
  setAlarm(scheduledTime: number | Date): Promise<void>
}

interface PedalDurableObjectState {
  acceptWebSocket(webSocket: WebSocket, tags?: string[]): void
  getWebSockets(tag?: string): HibernatingWebSocket[]
  storage: PedalStorage
}

interface SessionAttachment {
  rateLimit: {
    count: number
    startedAt: number
  }
  role: PedalParticipantRole
}

interface WebSocketPairConstructor {
  new (): {
    0: WebSocket
    1: WebSocket
  }
}

function asStateError(error: unknown) {
  if (error instanceof PedalSessionStateError) {
    return error
  }
  throw error
}

function closeWithPolicyViolation(socket: WebSocket, reason: string) {
  socket.close(1008, reason.slice(0, 123))
}

function parseSignalMessage(message: string | ArrayBuffer): SignalMessage | undefined {
  const text = typeof message === "string" ? message : new TextDecoder().decode(message)
  if (new TextEncoder().encode(text).byteLength > MAX_SIGNAL_BYTES) {
    return undefined
  }
  try {
    const parsed = v.safeParse(signalMessageSchema, JSON.parse(text))
    return parsed.success ? parsed.output : undefined
  } catch {
    return undefined
  }
}

function getAttachment(socket: HibernatingWebSocket) {
  const attachment = socket.deserializeAttachment()
  if (!attachment || typeof attachment !== "object") {
    return undefined
  }
  const parsed = attachment as Partial<SessionAttachment>
  if (
    (parsed.role !== "host" && parsed.role !== "guest") ||
    !parsed.rateLimit ||
    typeof parsed.rateLimit.count !== "number" ||
    typeof parsed.rateLimit.startedAt !== "number"
  ) {
    return undefined
  }
  return parsed as SessionAttachment
}

function allowsSignalMessage(attachment: SessionAttachment, now: number) {
  if (now - attachment.rateLimit.startedAt >= 60_000) {
    attachment.rateLimit = { count: 1, startedAt: now }
    return true
  }
  attachment.rateLimit.count += 1
  return attachment.rateLimit.count <= MAX_SIGNAL_MESSAGES_PER_MINUTE
}

export class PedalSessionHandler {
  constructor(
    private readonly state: PedalDurableObjectState,
    _env: unknown,
  ) {}

  async initialize(input: NewPedalSessionRecord) {
    const existing = await this.state.storage.get<PedalSessionRecord>(SESSION_KEY)
    if (existing) {
      throw new PedalSessionStateError("CONFLICT", "session already exists")
    }
    const session = new PedalSessionState(input)
    await this.persist(session)
    await this.state.storage.setAlarm(Date.now() + SESSION_ALARM_DELAY_MS)
  }

  async authorize(input: { role: PedalParticipantRole; tokenHash: string }) {
    const session = await this.loadSession()
    session.authorize(input.role, input.tokenHash, new Date())
  }

  async end(input: { tokenHash: string }) {
    const session = await this.loadSession()
    session.end(input.tokenHash, new Date())
    await this.persist(session)
    for (const socket of this.state.getWebSockets()) {
      socket.close(1000, "session ended")
    }
    return { ended: true as const }
  }

  async fetch(request: Request) {
    if (new URL(request.url).pathname !== "/signal") {
      return new Response("Not found", { status: 404 })
    }
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket upgrade required", { status: 426 })
    }
    if (!this.hasAllowedOrigin(request)) {
      return new Response("Forbidden", { status: 403 })
    }

    const pair = new (
      globalThis as unknown as { WebSocketPair: WebSocketPairConstructor }
    ).WebSocketPair()
    this.state.acceptWebSocket(pair[1], ["pedal"])
    return new Response(null, { status: 101, webSocket: pair[0] } as ResponseInit)
  }

  async webSocketMessage(socket: HibernatingWebSocket, message: string | ArrayBuffer) {
    const signal = parseSignalMessage(message)
    if (!signal) {
      closeWithPolicyViolation(socket, "invalid signal message")
      return
    }

    const attachment = getAttachment(socket)
    if (!attachment) {
      await this.handleHello(socket, signal)
      return
    }
    if (signal.type === "hello") {
      closeWithPolicyViolation(socket, "duplicate hello")
      return
    }
    if (signal.type === "peer-state") {
      closeWithPolicyViolation(socket, "peer state is server controlled")
      return
    }
    if (!allowsSignalMessage(attachment, Date.now())) {
      closeWithPolicyViolation(socket, "signal rate limit exceeded")
      return
    }
    socket.serializeAttachment(attachment)

    try {
      const session = await this.loadSession()
      session.assertActive(new Date())
    } catch (error) {
      asStateError(error)
      closeWithPolicyViolation(socket, "session expired")
      return
    }

    for (const peer of this.state.getWebSockets("pedal")) {
      const peerAttachment = getAttachment(peer)
      if (peer !== socket && peerAttachment && peerAttachment.role !== attachment.role) {
        peer.send(JSON.stringify(signal))
      }
    }
  }

  async webSocketClose(socket: HibernatingWebSocket) {
    await this.disconnectSocket(socket)
  }

  async webSocketError(socket: HibernatingWebSocket) {
    await this.disconnectSocket(socket)
  }

  async alarm() {
    for (const socket of this.state.getWebSockets()) {
      socket.close(1000, "session expired")
    }
    await this.state.storage.deleteAll()
  }

  private async handleHello(socket: HibernatingWebSocket, signal: SignalMessage) {
    if (signal.type !== "hello") {
      closeWithPolicyViolation(socket, "hello required")
      return
    }
    try {
      const session = await this.loadSession()
      session.connect(signal.role, await this.hashToken(signal.token), new Date())
      await this.persist(session)
      socket.serializeAttachment({
        rateLimit: { count: 0, startedAt: Date.now() },
        role: signal.role,
      } satisfies SessionAttachment)
      this.broadcastPeerState()
    } catch (error) {
      asStateError(error)
      closeWithPolicyViolation(socket, "connection rejected")
    }
  }

  private async disconnectSocket(socket: HibernatingWebSocket) {
    const attachment = getAttachment(socket)
    if (!attachment) {
      return
    }
    try {
      const session = await this.loadSession()
      session.disconnect(attachment.role, new Date())
      await this.persist(session)
    } catch (error) {
      if (!(error instanceof PedalSessionStateError)) {
        throw error
      }
    }
  }

  private broadcastPeerState() {
    const peers = this.state.getWebSockets("pedal").flatMap((socket) => {
      const attachment = getAttachment(socket)
      return attachment ? [{ attachment, socket }] : []
    })
    const roles = new Set(peers.map(({ attachment }) => attachment.role))
    const state = roles.has("host") && roles.has("guest") ? "ready" : "waiting"
    for (const { socket } of peers) {
      socket.send(JSON.stringify({ v: 1, type: "peer-state", state }))
    }
  }

  private async hashToken(token: string) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
  }

  private hasAllowedOrigin(request: Request) {
    const origin = request.headers.get("Origin")
    if (!origin) {
      return false
    }
    try {
      const source = new URL(origin)
      const target = new URL(request.url)
      if (source.origin === target.origin) {
        return true
      }
      return (
        (source.hostname === "localhost" || source.hostname === "127.0.0.1") &&
        (target.hostname === "localhost" || target.hostname === "127.0.0.1")
      )
    } catch {
      return false
    }
  }

  private async loadSession() {
    const record = await this.state.storage.get<PedalSessionRecord>(SESSION_KEY)
    if (!record) {
      throw new PedalSessionStateError("NOT_FOUND", "session not found")
    }
    return new PedalSessionState(record)
  }

  private async persist(session: PedalSessionState) {
    await this.state.storage.put(SESSION_KEY, session.snapshot())
  }
}
