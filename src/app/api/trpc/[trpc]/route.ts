import { createTRPCContext } from "@/server/pedal/context"
import { createPedalFetchHandler } from "@/server/pedal/fetch-handler"

export const dynamic = "force-dynamic"

async function handler(request: Request) {
  return createPedalFetchHandler(await createTRPCContext(request))(request)
}

export { handler as GET, handler as POST }
