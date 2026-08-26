const RECONNECT_WINDOW_MS = 30 * 1_000

export type PedalParticipantRole = "host" | "guest"

interface ParticipantState {
  connected: boolean
  hasConnected: boolean
  lastDisconnectedAt?: string
}

export interface PedalSessionRecord {
  activeExpiresAt: string
  ended: boolean
  guest: ParticipantState
  guestTokenHash: string
  host: ParticipantState
  hostTokenHash: string
  pairingExpiresAt: string
}

export interface NewPedalSessionRecord {
  activeExpiresAt: string
  guestTokenHash: string
  hostTokenHash: string
  pairingExpiresAt: string
}

export class PedalSessionStateError extends Error {
  constructor(
    readonly code: "CONFLICT" | "NOT_FOUND" | "UNAUTHORIZED",
    message: string,
  ) {
    super(message)
    this.name = "PedalSessionStateError"
  }
}

function matchesTokenHash(expected: string, received: string) {
  const length = Math.max(expected.length, received.length)
  let difference = expected.length ^ received.length
  for (let index = 0; index < length; index += 1) {
    difference |= (expected.charCodeAt(index) || 0) ^ (received.charCodeAt(index) || 0)
  }
  return difference === 0
}

export class PedalSessionState {
  private readonly record: PedalSessionRecord

  constructor(record: NewPedalSessionRecord | PedalSessionRecord) {
    this.record =
      "ended" in record
        ? structuredClone(record)
        : {
            ...record,
            ended: false,
            guest: { connected: false, hasConnected: false },
            host: { connected: false, hasConnected: false },
          }
  }

  authorize(role: PedalParticipantRole, tokenHash: string, now: Date) {
    this.assertActive(now)
    this.assertToken(role, tokenHash)
    if (
      role === "guest" &&
      !this.record.guest.hasConnected &&
      now.getTime() > Date.parse(this.record.pairingExpiresAt)
    ) {
      throw new PedalSessionStateError("UNAUTHORIZED", "pairing expired")
    }
  }

  assertActive(now: Date) {
    this.ensureActive(now)
  }

  connect(role: PedalParticipantRole, tokenHash: string, now: Date) {
    this.authorize(role, tokenHash, now)
    const participant = this.participant(role)
    if (participant.connected) {
      throw new PedalSessionStateError("CONFLICT", "participant is already connected")
    }
    if (
      participant.hasConnected &&
      participant.lastDisconnectedAt &&
      now.getTime() - Date.parse(participant.lastDisconnectedAt) > RECONNECT_WINDOW_MS
    ) {
      throw new PedalSessionStateError("UNAUTHORIZED", "reconnect window expired")
    }

    participant.connected = true
    participant.hasConnected = true
    participant.lastDisconnectedAt = undefined
  }

  disconnect(role: PedalParticipantRole, now: Date) {
    const participant = this.participant(role)
    if (!participant.connected) {
      return
    }
    participant.connected = false
    participant.lastDisconnectedAt = now.toISOString()
  }

  end(tokenHash: string, now: Date) {
    this.ensureActive(now)
    this.assertToken("host", tokenHash)
    this.record.ended = true
    this.record.host.connected = false
    this.record.guest.connected = false
  }

  snapshot() {
    return structuredClone(this.record)
  }

  private ensureActive(now: Date) {
    if (this.record.ended || now.getTime() > Date.parse(this.record.activeExpiresAt)) {
      throw new PedalSessionStateError("NOT_FOUND", "session has ended")
    }
  }

  private assertToken(role: PedalParticipantRole, tokenHash: string) {
    const expected = role === "host" ? this.record.hostTokenHash : this.record.guestTokenHash
    if (!matchesTokenHash(expected, tokenHash)) {
      throw new PedalSessionStateError("UNAUTHORIZED", "invalid session token")
    }
  }

  private participant(role: PedalParticipantRole) {
    return role === "host" ? this.record.host : this.record.guest
  }
}
