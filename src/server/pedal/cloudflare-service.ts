import * as v from "valibot"

import { iceServerSchema } from "@/lib/pedal-protocol"
import type { IceServerConfig } from "@/lib/pedal-protocol"

import type {
  CreateSessionOutput,
  EndSessionInput,
  IssueIceServersInput,
  IssueIceServersOutput,
  PedalService,
} from "./contracts"

const PAIRING_WINDOW_MS = 10 * 60 * 1_000
const SESSION_WINDOW_MS = 2 * 60 * 60 * 1_000
const TURN_CREDENTIAL_WINDOW_SECONDS = 130 * 60
const TURN_REQUEST_TIMEOUT_MS = 5_000

const turnResponseSchema = v.object({
  iceServers: v.array(iceServerSchema),
})

type PedalRole = "host" | "guest"

interface PedalSessionStub {
  authorize: (input: { role: PedalRole; tokenHash: string }) => Promise<void>
  end: (input: { tokenHash: string }) => Promise<{ ended: true }>
  initialize: (input: {
    activeExpiresAt: string
    guestTokenHash: string
    hostTokenHash: string
    pairingExpiresAt: string
  }) => Promise<void>
}

interface PedalSessionsNamespace {
  getByName: (name: string) => PedalSessionStub
}

export interface PedalCloudflareEnv {
  PEDAL_ALLOW_STUN_ONLY?: string
  PEDAL_SESSION_RATE_LIMITER?: {
    limit: (input: { key: string }) => Promise<{ success: boolean }>
  }
  PEDAL_SESSIONS: PedalSessionsNamespace
  TURN_KEY_API_TOKEN?: string
  TURN_KEY_ID?: string
}

export class PedalServiceError extends Error {
  constructor(
    readonly code:
      | "CONFLICT"
      | "INTERNAL_SERVER_ERROR"
      | "NOT_FOUND"
      | "TOO_MANY_REQUESTS"
      | "UNAUTHORIZED",
    message: string,
  ) {
    super(message)
    this.name = "PedalServiceError"
  }
}

const pedalErrorCodes = new Set<PedalServiceError["code"]>([
  "CONFLICT",
  "INTERNAL_SERVER_ERROR",
  "NOT_FOUND",
  "TOO_MANY_REQUESTS",
  "UNAUTHORIZED",
])

async function callPedalSession<Result>(operation: () => Promise<Result>) {
  try {
    return await operation()
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof error.code === "string" &&
      pedalErrorCodes.has(error.code as PedalServiceError["code"])
    ) {
      throw new PedalServiceError(error.code as PedalServiceError["code"], "pedal session rejected")
    }
    throw error
  }
}

interface CloudflarePedalServiceOptions {
  env: PedalCloudflareEnv
  fetch?: typeof fetch
  now?: () => Date
  origin: string
  randomToken?: () => string
  rateLimitKey?: string
}

function base64Url(bytes: Uint8Array) {
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "")
}

function createToken(bytesLength: number) {
  return () => base64Url(crypto.getRandomValues(new Uint8Array(bytesLength)))
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

function isLocalOrigin(origin: string) {
  const hostname = new URL(origin).hostname
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
}

function filterBrowserUnsafeTurnUrls(iceServers: IceServerConfig[]) {
  return iceServers.flatMap((server) => {
    const urls = (Array.isArray(server.urls) ? server.urls : [server.urls]).filter(
      (url) => !/^turns?:.+:53(?:\?|$)/iu.test(url),
    )
    return urls.length > 0 ? [{ ...server, urls }] : []
  })
}

async function createTurnIceServers(env: PedalCloudflareEnv, fetchImplementation: typeof fetch) {
  const keyId = env.TURN_KEY_ID
  const apiToken = env.TURN_KEY_API_TOKEN
  if (!keyId || !apiToken) {
    return undefined
  }

  let response: Response
  try {
    response = await fetchImplementation(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`,
      {
        body: JSON.stringify({ ttl: TURN_CREDENTIAL_WINDOW_SECONDS }),
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: AbortSignal.timeout(TURN_REQUEST_TIMEOUT_MS),
      },
    )
  } catch {
    throw new PedalServiceError("INTERNAL_SERVER_ERROR", "TURN credentials are unavailable")
  }
  if (!response.ok) {
    throw new PedalServiceError("INTERNAL_SERVER_ERROR", "TURN credentials are unavailable")
  }

  let responseBody: unknown
  try {
    responseBody = await response.json()
  } catch {
    throw new PedalServiceError("INTERNAL_SERVER_ERROR", "TURN returned invalid credentials")
  }
  const parsed = v.safeParse(turnResponseSchema, responseBody)
  if (!parsed.success) {
    throw new PedalServiceError("INTERNAL_SERVER_ERROR", "TURN returned invalid credentials")
  }
  return filterBrowserUnsafeTurnUrls(parsed.output.iceServers)
}

export function createCloudflarePedalService({
  env,
  fetch: fetchImplementation = fetch,
  now = () => new Date(),
  origin,
  randomToken,
  rateLimitKey,
}: CloudflarePedalServiceOptions): PedalService {
  const createRandomToken = randomToken ?? createToken(24)

  return {
    async createSession(): Promise<CreateSessionOutput> {
      if (env.PEDAL_SESSION_RATE_LIMITER) {
        const rateLimit = await env.PEDAL_SESSION_RATE_LIMITER.limit({
          key: rateLimitKey ?? "pedal-session-unknown-client",
        })
        if (!rateLimit.success) {
          throw new PedalServiceError("TOO_MANY_REQUESTS", "pedal session rate limit exceeded")
        }
      }

      const sessionId = createRandomToken()
      const hostToken = createRandomToken()
      const guestToken = createRandomToken()
      const createdAt = now()
      const pairingExpiresAt = new Date(createdAt.getTime() + PAIRING_WINDOW_MS)
      const activeExpiresAt = new Date(createdAt.getTime() + SESSION_WINDOW_MS)

      await callPedalSession(async () =>
        env.PEDAL_SESSIONS.getByName(sessionId).initialize({
          activeExpiresAt: activeExpiresAt.toISOString(),
          guestTokenHash: await hashToken(guestToken),
          hostTokenHash: await hashToken(hostToken),
          pairingExpiresAt: pairingExpiresAt.toISOString(),
        }),
      )

      const signalPath = `/api/pedal/sessions/${sessionId}/signal`
      const joinUrl = new URL(`/pedal/${sessionId}`, origin)
      joinUrl.hash = guestToken

      return {
        hostToken,
        joinUrl: joinUrl.toString(),
        pairingExpiresAt: pairingExpiresAt.toISOString(),
        sessionId,
        signalPath,
      }
    },

    async issueIceServers(input: IssueIceServersInput): Promise<IssueIceServersOutput> {
      await callPedalSession(async () =>
        env.PEDAL_SESSIONS.getByName(input.sessionId).authorize({
          role: input.role,
          tokenHash: await hashToken(input.token),
        }),
      )

      const expiresAt = new Date(now().getTime() + TURN_CREDENTIAL_WINDOW_SECONDS * 1_000)
      const iceServers = await createTurnIceServers(env, fetchImplementation)
      if (iceServers) {
        return {
          credentialExpiresAt: expiresAt.toISOString(),
          iceServers,
          iceTransportPolicy: "all",
        }
      }
      const allowsDevelopmentStun =
        env.PEDAL_ALLOW_STUN_ONLY === "true" && input.clientOrigin !== undefined
      if (isLocalOrigin(origin) || allowsDevelopmentStun) {
        return {
          credentialExpiresAt: expiresAt.toISOString(),
          iceServers: [{ urls: ["stun:stun.cloudflare.com:3478"] }],
          iceTransportPolicy: "all",
        }
      }

      throw new PedalServiceError("INTERNAL_SERVER_ERROR", "TURN credentials are not configured")
    },

    async endSession(input: EndSessionInput) {
      return callPedalSession(async () =>
        env.PEDAL_SESSIONS.getByName(input.sessionId).end({
          tokenHash: await hashToken(input.token),
        }),
      )
    },
  }
}
