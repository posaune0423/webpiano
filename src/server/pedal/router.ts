import { TRPCError, initTRPC } from "@trpc/server"

import { PedalServiceError } from "./cloudflare-service"
import {
  createSessionOutputSchema,
  endSessionInputSchema,
  endSessionOutputSchema,
  issueIceServersInputSchema,
  issueIceServersOutputSchema,
} from "./contracts"
import type { PedalRouterContext } from "./contracts"

const t = initTRPC.context<PedalRouterContext>().create()

async function runPedalMutation<Result>(operation: () => Promise<Result>) {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof PedalServiceError) {
      throw new TRPCError({
        code: error.code,
        message: error.message,
      })
    }
    throw error
  }
}

export function createPedalRouter(context: PedalRouterContext) {
  return t.router({
    pedal: t.router({
      createSession: t.procedure
        .output(createSessionOutputSchema)
        .mutation(async () => runPedalMutation(async () => context.pedal.createSession())),
      issueIceServers: t.procedure
        .input(issueIceServersInputSchema)
        .output(issueIceServersOutputSchema)
        .mutation(async ({ input }) =>
          runPedalMutation(async () => context.pedal.issueIceServers(input)),
        ),
      endSession: t.procedure
        .input(endSessionInputSchema)
        .output(endSessionOutputSchema)
        .mutation(async ({ input }) =>
          runPedalMutation(async () => context.pedal.endSession(input)),
        ),
    }),
  })
}

export type AppRouter = ReturnType<typeof createPedalRouter>
