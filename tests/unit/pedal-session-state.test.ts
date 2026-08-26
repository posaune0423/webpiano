import { expect, test } from "bun:test"

test("permits one host and one guest while the pairing window is active", async () => {
  const { PedalSessionState } = await import("@/cloudflare/pedal-session-state")
  const session = new PedalSessionState({
    activeExpiresAt: "2026-08-26T03:00:00.000Z",
    guestTokenHash: "guest-hash",
    hostTokenHash: "host-hash",
    pairingExpiresAt: "2026-08-26T01:10:00.000Z",
  })

  expect(session.connect("host", "host-hash", new Date("2026-08-26T01:00:00.000Z"))).toBeUndefined()
  expect(
    session.connect("guest", "guest-hash", new Date("2026-08-26T01:05:00.000Z")),
  ).toBeUndefined()
  expect(() =>
    session.connect("guest", "guest-hash", new Date("2026-08-26T01:06:00.000Z")),
  ).toThrow("already connected")
})

test("rejects a late guest and a reconnect outside the grace window", async () => {
  const { PedalSessionState } = await import("@/cloudflare/pedal-session-state")
  const session = new PedalSessionState({
    activeExpiresAt: "2026-08-26T03:00:00.000Z",
    guestTokenHash: "guest-hash",
    hostTokenHash: "host-hash",
    pairingExpiresAt: "2026-08-26T01:10:00.000Z",
  })

  expect(() =>
    session.connect("guest", "guest-hash", new Date("2026-08-26T01:10:01.000Z")),
  ).toThrow("pairing expired")

  session.connect("host", "host-hash", new Date("2026-08-26T01:00:00.000Z"))
  session.disconnect("host", new Date("2026-08-26T01:00:01.000Z"))
  expect(session.connect("host", "host-hash", new Date("2026-08-26T01:00:30.000Z"))).toBeUndefined()
  session.disconnect("host", new Date("2026-08-26T01:00:31.000Z"))
  expect(() => session.connect("host", "host-hash", new Date("2026-08-26T01:01:02.000Z"))).toThrow(
    "reconnect window expired",
  )
})

test("allows a paired guest to reconnect after pairing expiry within the grace window", async () => {
  const { PedalSessionState } = await import("@/cloudflare/pedal-session-state")
  const session = new PedalSessionState({
    activeExpiresAt: "2026-08-26T03:00:00.000Z",
    guestTokenHash: "guest-hash",
    hostTokenHash: "host-hash",
    pairingExpiresAt: "2026-08-26T01:10:00.000Z",
  })

  session.connect("guest", "guest-hash", new Date("2026-08-26T01:09:50.000Z"))
  session.disconnect("guest", new Date("2026-08-26T01:10:01.000Z"))

  expect(
    session.connect("guest", "guest-hash", new Date("2026-08-26T01:10:20.000Z")),
  ).toBeUndefined()
})
