import { expect, test } from "bun:test"

import { PedalSessionHandler } from "@/cloudflare/pedal-session"

async function hash(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

function createSocket() {
  let attachment: unknown
  const sent: string[] = []
  return {
    attachment: () => attachment,
    close: () => undefined,
    deserializeAttachment: () => attachment,
    send: (message: string) => sent.push(message),
    sent,
    serializeAttachment: (value: unknown) => {
      attachment = value
    },
  }
}

function sentMessages(socket: ReturnType<typeof createSocket>) {
  return socket.sent.map((message) => JSON.parse(message) as unknown)
}

test("notifies both peers only after the host and guest are authenticated", async () => {
  const host = createSocket()
  const guest = createSocket()
  let record: unknown
  const session = new PedalSessionHandler(
    {
      acceptWebSocket: () => undefined,
      getWebSockets: () => [host, guest],
      storage: {
        deleteAll: async () => undefined,
        get: async () => record,
        put: async (_key: string, value: unknown) => {
          record = value
        },
        setAlarm: async () => undefined,
      },
    } as never,
    undefined,
  )
  const hostToken = "h".repeat(32)
  const guestToken = "g".repeat(32)
  await session.initialize({
    activeExpiresAt: "2099-08-26T03:00:00.000Z",
    guestTokenHash: await hash(guestToken),
    hostTokenHash: await hash(hostToken),
    pairingExpiresAt: "2099-08-26T01:10:00.000Z",
  })

  await session.webSocketMessage(
    host as never,
    JSON.stringify({
      v: 1,
      type: "hello",
      role: "host",
      token: hostToken,
    }),
  )
  expect(sentMessages(host)).toEqual([{ v: 1, type: "peer-state", state: "waiting" }])

  await session.webSocketMessage(
    guest as never,
    JSON.stringify({
      v: 1,
      type: "hello",
      role: "guest",
      token: guestToken,
    }),
  )
  expect(sentMessages(host).at(-1)).toEqual({
    v: 1,
    type: "peer-state",
    state: "ready",
  })
  expect(sentMessages(guest).at(-1)).toEqual({
    v: 1,
    type: "peer-state",
    state: "ready",
  })
})

test("relays signaling only to an authenticated peer with the opposite role", async () => {
  const host = createSocket()
  const guest = createSocket()
  const unauthenticated = createSocket()
  let record: unknown
  const session = new PedalSessionHandler(
    {
      acceptWebSocket: () => undefined,
      getWebSockets: () => [host, guest, unauthenticated],
      storage: {
        deleteAll: async () => undefined,
        get: async () => record,
        put: async (_key: string, value: unknown) => {
          record = value
        },
        setAlarm: async () => undefined,
      },
    } as never,
    undefined,
  )
  const hostToken = "h".repeat(32)
  const guestToken = "g".repeat(32)
  await session.initialize({
    activeExpiresAt: "2099-08-26T03:00:00.000Z",
    guestTokenHash: await hash(guestToken),
    hostTokenHash: await hash(hostToken),
    pairingExpiresAt: "2099-08-26T01:10:00.000Z",
  })
  await session.webSocketMessage(
    host as never,
    JSON.stringify({ v: 1, type: "hello", role: "host", token: hostToken }),
  )
  await session.webSocketMessage(
    guest as never,
    JSON.stringify({ v: 1, type: "hello", role: "guest", token: guestToken }),
  )
  host.sent.length = 0
  guest.sent.length = 0
  unauthenticated.sent.length = 0

  await session.webSocketMessage(
    host as never,
    JSON.stringify({ v: 1, type: "offer", sdp: "host-offer" }),
  )

  expect(sentMessages(guest)).toEqual([{ v: 1, type: "offer", sdp: "host-offer" }])
  expect(sentMessages(unauthenticated)).toEqual([])
})

test("does not relay a client-authored peer state", async () => {
  const host = createSocket()
  const guest = createSocket()
  let record: unknown
  const session = new PedalSessionHandler(
    {
      acceptWebSocket: () => undefined,
      getWebSockets: () => [host, guest],
      storage: {
        deleteAll: async () => undefined,
        get: async () => record,
        put: async (_key: string, value: unknown) => {
          record = value
        },
        setAlarm: async () => undefined,
      },
    } as never,
    undefined,
  )
  const hostToken = "h".repeat(32)
  const guestToken = "g".repeat(32)
  await session.initialize({
    activeExpiresAt: "2099-08-26T03:00:00.000Z",
    guestTokenHash: await hash(guestToken),
    hostTokenHash: await hash(hostToken),
    pairingExpiresAt: "2099-08-26T01:10:00.000Z",
  })
  await session.webSocketMessage(
    host as never,
    JSON.stringify({ v: 1, type: "hello", role: "host", token: hostToken }),
  )
  await session.webSocketMessage(
    guest as never,
    JSON.stringify({ v: 1, type: "hello", role: "guest", token: guestToken }),
  )
  host.sent.length = 0
  guest.sent.length = 0

  await session.webSocketMessage(
    guest as never,
    JSON.stringify({ v: 1, type: "peer-state", state: "waiting" }),
  )

  expect(sentMessages(host)).toEqual([])
})
