/* oxlint-disable typescript/await-thenable */

import { expect, test } from "bun:test"

function createFetch(
  implementation: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): typeof fetch {
  return Object.assign(implementation, { preconnect: () => undefined })
}

test("creates a session with token hashes while returning capability tokens only to the caller", async () => {
  const { createCloudflarePedalService } = await import("@/server/pedal/cloudflare-service")
  const initialized: unknown[] = []
  const service = createCloudflarePedalService({
    env: {
      PEDAL_SESSIONS: {
        getByName: () => ({
          authorize: async () => undefined,
          end: async () => ({ ended: true as const }),
          initialize: async (input: unknown) => {
            initialized.push(input)
          },
        }),
      },
    },
    now: () => new Date("2026-08-26T01:00:00.000Z"),
    origin: "https://webpiano.xyz",
    randomToken: (() => {
      const tokens = ["s".repeat(22), "h".repeat(32), "g".repeat(32)]
      return () => tokens.shift()!
    })(),
  })

  await expect(service.createSession()).resolves.toEqual({
    hostToken: "h".repeat(32),
    joinUrl: `https://webpiano.xyz/pedal/${"s".repeat(22)}#${"g".repeat(32)}`,
    pairingExpiresAt: "2026-08-26T01:10:00.000Z",
    sessionId: "s".repeat(22),
    signalPath: `/api/pedal/sessions/${"s".repeat(22)}/signal`,
  })

  expect(initialized).toHaveLength(1)
  expect(JSON.stringify(initialized[0])).not.toContain("h".repeat(32))
  expect(JSON.stringify(initialized[0])).not.toContain("g".repeat(32))
})

test("uses STUN only for a local session without TURN secrets", async () => {
  const { createCloudflarePedalService } = await import("@/server/pedal/cloudflare-service")
  const service = createCloudflarePedalService({
    env: {
      PEDAL_SESSIONS: {
        getByName: () => ({
          authorize: async () => undefined,
          end: async () => ({ ended: true as const }),
          initialize: async () => undefined,
        }),
      },
    },
    origin: "http://localhost:3000",
  })

  await expect(
    service.issueIceServers({
      role: "host",
      sessionId: "s".repeat(22),
      token: "h".repeat(32),
    }),
  ).resolves.toMatchObject({
    iceServers: [{ urls: ["stun:stun.cloudflare.com:3478"] }],
    iceTransportPolicy: "all",
  })
})

test("uses the typed client origin for an OpenNext local preview", async () => {
  const { createCloudflarePedalService } = await import("@/server/pedal/cloudflare-service")
  const service = createCloudflarePedalService({
    env: {
      PEDAL_ALLOW_STUN_ONLY: "true",
      PEDAL_SESSIONS: {
        getByName: () => ({
          authorize: async () => undefined,
          end: async () => ({ ended: true as const }),
          initialize: async () => undefined,
        }),
      },
    },
    origin: "https://webpiano.xyz",
  })

  await expect(
    service.issueIceServers({
      clientOrigin: "http://localhost:8787",
      role: "guest",
      sessionId: "s".repeat(22),
      token: "g".repeat(32),
    }),
  ).resolves.toMatchObject({
    iceServers: [{ urls: ["stun:stun.cloudflare.com:3478"] }],
    iceTransportPolicy: "all",
  })
})

test("uses STUN for a LAN phone when the server-owned preview flag is enabled", async () => {
  const { createCloudflarePedalService } = await import("@/server/pedal/cloudflare-service")
  const service = createCloudflarePedalService({
    env: {
      PEDAL_ALLOW_STUN_ONLY: "true",
      PEDAL_SESSIONS: {
        getByName: () => ({
          authorize: async () => undefined,
          end: async () => ({ ended: true as const }),
          initialize: async () => undefined,
        }),
      },
    },
    origin: "https://webpiano.xyz",
  })

  await expect(
    service.issueIceServers({
      clientOrigin: "http://192.168.11.56:8787",
      role: "guest",
      sessionId: "s".repeat(22),
      token: "g".repeat(32),
    }),
  ).resolves.toMatchObject({
    iceServers: [{ urls: ["stun:stun.cloudflare.com:3478"] }],
    iceTransportPolicy: "all",
  })
})

test("does not let a client origin enable STUN-only in production", async () => {
  const { PedalServiceError, createCloudflarePedalService } =
    await import("@/server/pedal/cloudflare-service")
  const service = createCloudflarePedalService({
    env: {
      PEDAL_SESSIONS: {
        getByName: () => ({
          authorize: async () => undefined,
          end: async () => ({ ended: true as const }),
          initialize: async () => undefined,
        }),
      },
    },
    origin: "https://webpiano.xyz",
  })

  await expect(
    service.issueIceServers({
      clientOrigin: "http://localhost:8787",
      role: "guest",
      sessionId: "s".repeat(22),
      token: "g".repeat(32),
    }),
  ).rejects.toBeInstanceOf(PedalServiceError)
})

test("removes only TURN port 53 URLs and drops empty server entries", async () => {
  const { createCloudflarePedalService } = await import("@/server/pedal/cloudflare-service")
  const fetchTurnCredentials = createFetch(async () =>
    Response.json({
      iceServers: [
        {
          credential: "credential",
          urls: [
            "turn:turn.cloudflare.com:53?transport=udp",
            "turn:turn.cloudflare.com:5349?transport=tcp",
            "turns:turn.cloudflare.com:5349?transport=tcp",
          ],
          username: "username",
        },
        {
          credential: "credential",
          urls: "turn:turn.cloudflare.com:53?transport=tcp",
          username: "username",
        },
      ],
    }),
  )
  const service = createCloudflarePedalService({
    env: {
      PEDAL_SESSIONS: {
        getByName: () => ({
          authorize: async () => undefined,
          end: async () => ({ ended: true as const }),
          initialize: async () => undefined,
        }),
      },
      TURN_KEY_API_TOKEN: "api-token",
      TURN_KEY_ID: "key-id",
    },
    fetch: fetchTurnCredentials,
    origin: "https://webpiano.xyz",
  })

  await expect(
    service.issueIceServers({
      role: "host",
      sessionId: "s".repeat(22),
      token: "h".repeat(32),
    }),
  ).resolves.toMatchObject({
    iceServers: [
      {
        urls: [
          "turn:turn.cloudflare.com:5349?transport=tcp",
          "turns:turn.cloudflare.com:5349?transport=tcp",
        ],
      },
    ],
  })
})

test("fails closed for a production session without TURN secrets", async () => {
  const { PedalServiceError, createCloudflarePedalService } =
    await import("@/server/pedal/cloudflare-service")
  const service = createCloudflarePedalService({
    env: {
      PEDAL_SESSIONS: {
        getByName: () => ({
          authorize: async () => undefined,
          end: async () => ({ ended: true as const }),
          initialize: async () => undefined,
        }),
      },
    },
    origin: "https://webpiano.xyz",
  })

  await expect(
    service.issueIceServers({
      role: "host",
      sessionId: "s".repeat(22),
      token: "h".repeat(32),
    }),
  ).rejects.toBeInstanceOf(PedalServiceError)
})

test("rejects session creation when the Cloudflare rate limit is exhausted", async () => {
  const { PedalServiceError, createCloudflarePedalService } =
    await import("@/server/pedal/cloudflare-service")
  const service = createCloudflarePedalService({
    env: {
      PEDAL_SESSION_RATE_LIMITER: {
        limit: async () => ({ success: false }),
      },
      PEDAL_SESSIONS: {
        getByName: () => ({
          authorize: async () => undefined,
          end: async () => ({ ended: true as const }),
          initialize: async () => undefined,
        }),
      },
    },
    origin: "https://webpiano.xyz",
    rateLimitKey: "203.0.113.10",
  })

  await expect(service.createSession()).rejects.toMatchObject({
    code: "TOO_MANY_REQUESTS",
    name: PedalServiceError.name,
  })
})

test("uses a fallback rate-limit key when the client address is unavailable", async () => {
  const { createCloudflarePedalService } = await import("@/server/pedal/cloudflare-service")
  const keys: string[] = []
  const service = createCloudflarePedalService({
    env: {
      PEDAL_SESSION_RATE_LIMITER: {
        limit: async ({ key }) => {
          keys.push(key)
          return { success: true }
        },
      },
      PEDAL_SESSIONS: {
        getByName: () => ({
          authorize: async () => undefined,
          end: async () => ({ ended: true as const }),
          initialize: async () => undefined,
        }),
      },
    },
    origin: "https://webpiano.xyz",
  })

  await service.createSession()

  expect(keys).toEqual(["pedal-session-unknown-client"])
})

test("uses an abort signal and maps a malformed TURN response to a typed error", async () => {
  const { PedalServiceError, createCloudflarePedalService } =
    await import("@/server/pedal/cloudflare-service")
  let requestSignal: AbortSignal | null | undefined
  const service = createCloudflarePedalService({
    env: {
      PEDAL_SESSIONS: {
        getByName: () => ({
          authorize: async () => undefined,
          end: async () => ({ ended: true as const }),
          initialize: async () => undefined,
        }),
      },
      TURN_KEY_API_TOKEN: "api-token",
      TURN_KEY_ID: "key-id",
    },
    fetch: createFetch(async (_input, init) => {
      requestSignal = init?.signal
      return new Response("not-json", { status: 200 })
    }),
    origin: "https://webpiano.xyz",
  })

  await expect(
    service.issueIceServers({
      role: "host",
      sessionId: "s".repeat(22),
      token: "h".repeat(32),
    }),
  ).rejects.toBeInstanceOf(PedalServiceError)
  expect(requestSignal).toBeInstanceOf(AbortSignal)
})

test("maps Durable Object authorization failures to a typed service error", async () => {
  const { PedalServiceError, createCloudflarePedalService } =
    await import("@/server/pedal/cloudflare-service")
  const service = createCloudflarePedalService({
    env: {
      PEDAL_SESSIONS: {
        getByName: () => ({
          authorize: async () => {
            throw { code: "UNAUTHORIZED" }
          },
          end: async () => ({ ended: true as const }),
          initialize: async () => undefined,
        }),
      },
    },
    origin: "http://localhost:3000",
  })

  await expect(
    service.issueIceServers({
      role: "host",
      sessionId: "s".repeat(22),
      token: "h".repeat(32),
    }),
  ).rejects.toBeInstanceOf(PedalServiceError)
})
