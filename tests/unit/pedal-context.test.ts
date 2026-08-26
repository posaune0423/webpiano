import { expect, test } from "bun:test"

test("creates a pedal service context from the incoming request origin", async () => {
  const { createPedalContext } = await import("@/server/pedal/context")
  const context = createPedalContext({
    env: {
      PEDAL_SESSIONS: {
        getByName: () => ({
          authorize: async () => undefined,
          end: async () => ({ ended: true as const }),
          initialize: async () => undefined,
        }),
      },
    },
    request: new Request("https://webpiano.xyz/api/trpc/pedal.createSession"),
  })

  expect(context.pedal).toHaveProperty("createSession")
  expect(context.pedal).toHaveProperty("issueIceServers")
  expect(context.pedal).toHaveProperty("endSession")
})

test("uses the explicit browser origin for preview pairing links", async () => {
  const { createPedalContext } = await import("@/server/pedal/context")
  const context = createPedalContext({
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
    request: {
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "x-webpiano-client-origin" ? "http://localhost:8787" : null,
      },
      url: "http://webpiano.xyz/api/trpc/pedal.createSession",
    } as unknown as Request,
  })

  const session = await context.pedal.createSession()

  expect(session.joinUrl).toStartWith("http://localhost:8787/pedal/")
})

test("ignores a forged local browser origin unless preview mode is enabled", async () => {
  const { createPedalContext } = await import("@/server/pedal/context")
  const context = createPedalContext({
    env: {
      PEDAL_SESSIONS: {
        getByName: () => ({
          authorize: async () => undefined,
          end: async () => ({ ended: true as const }),
          initialize: async () => undefined,
        }),
      },
    },
    request: new Request("https://webpiano.xyz/api/trpc/pedal.createSession", {
      headers: { "x-webpiano-client-origin": "http://localhost:8787" },
    }),
  })

  const session = await context.pedal.createSession()

  expect(session.joinUrl).toStartWith("https://webpiano.xyz/pedal/")
})
