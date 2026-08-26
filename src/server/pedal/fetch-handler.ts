import { fetchRequestHandler } from "@trpc/server/adapters/fetch"

import type { PedalRouterContext } from "./contracts"
import { createPedalRouter } from "./router"

const TRPC_ENDPOINT = "/api/trpc"

export function createPedalFetchHandler(context: PedalRouterContext) {
  const router = createPedalRouter(context)
  return async (request: Request) =>
    fetchRequestHandler({
      createContext: () => context,
      endpoint: TRPC_ENDPOINT,
      req: request,
      router,
    })
}
