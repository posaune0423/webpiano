import { getCloudflareContext } from "@opennextjs/cloudflare"

import { createCloudflarePedalService } from "./cloudflare-service"
import type { PedalCloudflareEnv } from "./cloudflare-service"
import type { PedalRouterContext } from "./contracts"

function getBrowserOrigin(request: Request, allowExplicitLocalOrigin: boolean) {
  const requestUrl = new URL(request.url)
  const origin = request.headers.get("x-webpiano-client-origin") ?? request.headers.get("Origin")

  if (origin) {
    try {
      const browserUrl = new URL(origin)
      const isLocal = browserUrl.hostname === "localhost" || browserUrl.hostname === "127.0.0.1"
      if ((isLocal && allowExplicitLocalOrigin) || browserUrl.hostname === requestUrl.hostname) {
        return browserUrl.origin
      }
    } catch {
      // Fall through to the Worker host headers.
    }
  }

  const forwardedHost =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? requestUrl.host
  const forwardedProtocol = request.headers.get("x-forwarded-proto") ?? requestUrl.protocol
  const protocol = forwardedProtocol.endsWith(":") ? forwardedProtocol : `${forwardedProtocol}:`

  try {
    const forwardedUrl = new URL(`${protocol}//${forwardedHost}`)
    const isLocal = forwardedUrl.hostname === "localhost" || forwardedUrl.hostname === "127.0.0.1"
    return isLocal || forwardedUrl.hostname === requestUrl.hostname
      ? forwardedUrl.origin
      : requestUrl.origin
  } catch {
    return requestUrl.origin
  }
}

export function createPedalContext({
  env,
  request,
}: {
  env: PedalCloudflareEnv
  request: Request
}): PedalRouterContext {
  return {
    pedal: createCloudflarePedalService({
      env,
      origin: getBrowserOrigin(request, env.PEDAL_ALLOW_STUN_ONLY === "true"),
      rateLimitKey:
        request.headers.get("cf-connecting-ip") ??
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        "anonymous",
    }),
  }
}

export async function createTRPCContext(request: Request): Promise<PedalRouterContext> {
  const cloudflare = await getCloudflareContext({ async: true })
  return createPedalContext({
    env: cloudflare.env,
    request,
  })
}
