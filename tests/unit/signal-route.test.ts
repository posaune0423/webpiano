import { expect, test } from "bun:test"

test("rewrites the public signal URL before passing it to the Durable Object", async () => {
  const { createPedalSignalRequest } = await import("@/cloudflare/signal-route")
  const request = createPedalSignalRequest(
    new Request("https://webpiano.xyz/api/pedal/sessions/session/signal", {
      headers: {
        Origin: "https://webpiano.xyz",
        Upgrade: "websocket",
      },
    }),
  )

  expect(request.url).toBe("https://webpiano.xyz/signal")
})
