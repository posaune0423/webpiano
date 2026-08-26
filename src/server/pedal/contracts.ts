import * as v from "valibot"

import { iceServerSchema } from "@/lib/pedal-protocol"

const pedalRoleSchema = v.picklist(["host", "guest"])

const pedalSessionIdSchema = v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]{22,128}$/))

const pedalTokenSchema = v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]{32,256}$/))

export const issueIceServersInputSchema = v.strictObject({
  clientOrigin: v.optional(v.pipe(v.string(), v.url())),
  role: pedalRoleSchema,
  sessionId: pedalSessionIdSchema,
  token: pedalTokenSchema,
})

export type IssueIceServersInput = v.InferOutput<typeof issueIceServersInputSchema>

export const endSessionInputSchema = v.strictObject({
  sessionId: pedalSessionIdSchema,
  token: pedalTokenSchema,
})

export type EndSessionInput = v.InferOutput<typeof endSessionInputSchema>

export const createSessionOutputSchema = v.strictObject({
  hostToken: pedalTokenSchema,
  joinUrl: v.pipe(v.string(), v.url()),
  pairingExpiresAt: v.pipe(v.string(), v.isoTimestamp()),
  sessionId: pedalSessionIdSchema,
  signalPath: v.pipe(v.string(), v.startsWith("/api/pedal/sessions/")),
})

export type CreateSessionOutput = v.InferOutput<typeof createSessionOutputSchema>

export const issueIceServersOutputSchema = v.strictObject({
  credentialExpiresAt: v.pipe(v.string(), v.isoTimestamp()),
  iceServers: v.array(iceServerSchema),
  iceTransportPolicy: v.picklist(["all", "relay"]),
})

export type IssueIceServersOutput = v.InferOutput<typeof issueIceServersOutputSchema>

export const endSessionOutputSchema = v.strictObject({
  ended: v.literal(true),
})

export interface PedalService {
  createSession: () => Promise<CreateSessionOutput>
  issueIceServers: (input: IssueIceServersInput) => Promise<IssueIceServersOutput>
  endSession: (input: EndSessionInput) => Promise<v.InferOutput<typeof endSessionOutputSchema>>
}

export interface PedalRouterContext {
  pedal: PedalService
}
