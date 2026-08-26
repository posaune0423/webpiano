import * as v from "valibot"

const PEDAL_PROTOCOL_VERSION = 1 as const

const protocolVersionSchema = v.literal(PEDAL_PROTOCOL_VERSION)
const tokenSchema = v.pipe(v.string(), v.minLength(32), v.maxLength(256))
const sdpSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(60_000))
const boundedTextSchema = v.pipe(v.string(), v.maxLength(4_096))

const iceCandidateSchema = v.strictObject({
  candidate: v.pipe(v.string(), v.maxLength(4_096)),
  sdpMid: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(255)))),
  sdpMLineIndex: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0)))),
  usernameFragment: v.optional(v.pipe(v.string(), v.maxLength(255))),
})

export const signalMessageSchema = v.variant("type", [
  v.strictObject({
    v: protocolVersionSchema,
    type: v.literal("hello"),
    role: v.picklist(["host", "guest"]),
    token: tokenSchema,
  }),
  v.strictObject({
    v: protocolVersionSchema,
    type: v.literal("offer"),
    sdp: sdpSchema,
  }),
  v.strictObject({
    v: protocolVersionSchema,
    type: v.literal("answer"),
    sdp: sdpSchema,
  }),
  v.strictObject({
    v: protocolVersionSchema,
    type: v.literal("ice"),
    candidate: iceCandidateSchema,
  }),
  v.strictObject({
    v: protocolVersionSchema,
    type: v.literal("peer-state"),
    state: v.pipe(v.string(), v.maxLength(64)),
  }),
  v.strictObject({
    v: protocolVersionSchema,
    type: v.literal("close"),
    reason: boundedTextSchema,
  }),
])

export type SignalMessage = v.InferOutput<typeof signalMessageSchema>

export const pedalStateMessageSchema = v.strictObject({
  v: protocolVersionSchema,
  type: v.literal("pedal"),
  seq: v.pipe(v.number(), v.integer(), v.minValue(0)),
  down: v.boolean(),
})

export type PedalStateMessage = v.InferOutput<typeof pedalStateMessageSchema>

export const iceServerSchema = v.strictObject({
  urls: v.union([
    v.pipe(v.string(), v.minLength(1), v.maxLength(2_048)),
    v.array(v.pipe(v.string(), v.minLength(1), v.maxLength(2_048))),
  ]),
  username: v.optional(v.pipe(v.string(), v.maxLength(1_024))),
  credential: v.optional(v.pipe(v.string(), v.maxLength(1_024))),
})

export type IceServerConfig = v.InferOutput<typeof iceServerSchema>

const iceConfigurationSchema = v.strictObject({
  iceServers: v.array(iceServerSchema),
  iceTransportPolicy: v.picklist(["all", "relay"]),
})

export type IceConfiguration = v.InferOutput<typeof iceConfigurationSchema>
