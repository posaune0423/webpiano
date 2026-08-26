/* oxlint-disable typescript/await-thenable */

import { expect, test } from "bun:test"

test("serves pedal mutations through the tRPC fetch adapter", async () => {
  const { createPedalFetchHandler } = await import("@/server/pedal/fetch-handler")
  const created = {
    hostToken: "h".repeat(32),
    joinUrl: `https://webpiano.xyz/pedal/${"s".repeat(22)}#${"g".repeat(32)}`,
    pairingExpiresAt: "2026-08-26T01:10:00.000Z",
    sessionId: "s".repeat(22),
    signalPath: `/api/pedal/sessions/${"s".repeat(22)}/signal`,
  }
  const handler = createPedalFetchHandler({
    pedal: {
      createSession: async () => created,
      endSession: async () => ({ ended: true }),
      issueIceServers: async () => ({
        credentialExpiresAt: "2026-08-26T03:00:00.000Z",
        iceServers: [{ urls: ["stun:stun.cloudflare.com:3478"] }],
        iceTransportPolicy: "all" as const,
      }),
    },
  })

  const response = await handler(
    new Request("https://webpiano.xyz/api/trpc/pedal.createSession", {
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  )

  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toMatchObject({ result: { data: created } })
})
