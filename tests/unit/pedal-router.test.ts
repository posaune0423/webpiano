/* oxlint-disable typescript/await-thenable */

import { expect, test } from "bun:test"

test("creates a short-lived pedal session through the tRPC mutation", async () => {
  const { createPedalRouter } = await import("@/server/pedal/router")
  const created = {
    hostToken: "h".repeat(32),
    joinUrl: `https://webpiano.xyz/pedal/${"s".repeat(22)}#${"g".repeat(32)}`,
    pairingExpiresAt: "2026-08-26T01:10:00.000Z",
    sessionId: "s".repeat(22),
    signalPath: `/api/pedal/sessions/${"s".repeat(22)}/signal`,
  }

  const router = createPedalRouter({
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

  await expect(router.createCaller({ pedal: {} as never }).pedal.createSession()).resolves.toEqual(
    created,
  )
})

test("exposes pedal authorization failures as a typed tRPC error", async () => {
  const [{ PedalServiceError }, { createPedalRouter }] = await Promise.all([
    import("@/server/pedal/cloudflare-service"),
    import("@/server/pedal/router"),
  ])
  const router = createPedalRouter({
    pedal: {
      createSession: async () => {
        throw new PedalServiceError("UNAUTHORIZED", "invalid session token")
      },
      endSession: async () => ({ ended: true }),
      issueIceServers: async () => ({
        credentialExpiresAt: "2026-08-26T03:00:00.000Z",
        iceServers: [{ urls: ["stun:stun.cloudflare.com:3478"] }],
        iceTransportPolicy: "all" as const,
      }),
    },
  })

  await expect(
    router.createCaller({ pedal: {} as never }).pedal.createSession(),
  ).rejects.toMatchObject({
    code: "UNAUTHORIZED",
  })
})

test("returns a validated ICE configuration through the tRPC mutation", async () => {
  const { createPedalRouter } = await import("@/server/pedal/router")
  const ice = {
    credentialExpiresAt: "2026-08-26T03:00:00.000Z",
    iceServers: [{ urls: ["stun:stun.cloudflare.com:3478"] }],
    iceTransportPolicy: "all" as const,
  }
  const router = createPedalRouter({
    pedal: {
      createSession: async () => ({
        hostToken: "h".repeat(32),
        joinUrl: `https://webpiano.xyz/pedal/${"s".repeat(22)}#${"g".repeat(32)}`,
        pairingExpiresAt: "2026-08-26T01:10:00.000Z",
        sessionId: "s".repeat(22),
        signalPath: `/api/pedal/sessions/${"s".repeat(22)}/signal`,
      }),
      endSession: async () => ({ ended: true }),
      issueIceServers: async () => ice,
    },
  })

  await expect(
    router.createCaller({ pedal: {} as never }).pedal.issueIceServers({
      role: "host",
      sessionId: "s".repeat(22),
      token: "h".repeat(32),
    }),
  ).resolves.toEqual(ice)
})
