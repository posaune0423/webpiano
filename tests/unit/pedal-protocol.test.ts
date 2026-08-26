import { expect, test } from "bun:test"

import * as v from "valibot"

test("validates the versioned pedal and signaling wire protocols", async () => {
  const protocol = await import("@/lib/pedal-protocol")

  expect(
    v.safeParse(protocol.pedalStateMessageSchema, {
      v: 1,
      type: "pedal",
      seq: 4,
      down: true,
    }).success,
  ).toBe(true)

  expect(
    v.safeParse(protocol.signalMessageSchema, {
      v: 1,
      type: "hello",
      role: "guest",
      token: "a".repeat(32),
    }).success,
  ).toBe(true)

  expect(
    v.safeParse(protocol.signalMessageSchema, {
      v: 1,
      type: "ice",
      candidate: { candidate: "candidate:1 1 udp 1 127.0.0.1 9 typ host" },
    }).success,
  ).toBe(true)

  expect(
    v.safeParse(protocol.pedalStateMessageSchema, {
      v: 2,
      type: "pedal",
      seq: 0,
      down: true,
    }).success,
  ).toBe(false)
})
