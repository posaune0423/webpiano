"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createTRPCClient, httpBatchLink } from "@trpc/client"
import type { TRPCClient } from "@trpc/client"
import { createTRPCContext } from "@trpc/tanstack-react-query"
import { useState } from "react"
import type { ReactNode } from "react"

import type { AppRouter } from "@/server/pedal/router"

const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>()

export { useTRPC }

export function makePedalQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
}

export function PedalApiProvider({
  children,
  client,
  queryClient: providedQueryClient,
}: {
  children: ReactNode
  client?: TRPCClient<AppRouter>
  queryClient?: QueryClient
}) {
  const [ownedQueryClient] = useState(makePedalQueryClient)
  const [ownedTrpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          headers: () => ({
            "x-webpiano-client-origin": window.location.origin,
          }),
        }),
      ],
    }),
  )
  const queryClient = providedQueryClient ?? ownedQueryClient
  const trpcClient = client ?? ownedTrpcClient

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  )
}
