"use client"

import { useMutation } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"

import { PedalSurface } from "@/components/pedal-surface"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PedalPeer } from "@/lib/pedal-peer"
import type { PedalPeerOptions, PedalPeerPort, PedalPeerStatus } from "@/lib/pedal-peer"
import { PedalPressController } from "@/lib/pedal-press"
import { useTRPC } from "@/trpc/client"

interface PedalRemoteProps {
  peerFactory?: (options: PedalPeerOptions) => PedalPeerPort
  sessionId: string
}

export function PedalRemote({
  sessionId,
  peerFactory = (options) => new PedalPeer(options),
}: PedalRemoteProps) {
  const trpc = useTRPC()
  const issueIceServers = useMutation(trpc.pedal.issueIceServers.mutationOptions())
  const issueIceServersRef = useRef(issueIceServers.mutateAsync)
  const factoryRef = useRef(peerFactory)
  const peer = useRef<PedalPeerPort | null>(null)
  const [pressController] = useState(() => new PedalPressController(() => undefined))
  const [error, setError] = useState<string>()
  const [status, setStatus] = useState<PedalPeerStatus>("connecting")

  useEffect(() => {
    pressController.setSender((message) => {
      peer.current?.sendPedal(message)
    })
    return () => pressController.setSender(() => undefined)
  }, [pressController])

  useEffect(() => {
    issueIceServersRef.current = issueIceServers.mutateAsync
    factoryRef.current = peerFactory
  }, [issueIceServers.mutateAsync, peerFactory])

  useEffect(() => {
    let cancelled = false

    async function connect() {
      const storageKey = `webpiano:pedal:${sessionId}`
      const fragment = decodeURIComponent(window.location.hash.slice(1)).replace(/^token=/u, "")
      const token = window.sessionStorage.getItem(storageKey) ?? fragment

      if (token.length < 32) {
        setError("This pedal link is invalid or expired. Create a new code on your computer.")
        setStatus("failed")
        return
      }

      window.sessionStorage.setItem(storageKey, token)
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`)

      try {
        const ice = await issueIceServersRef.current({
          clientOrigin: window.location.origin,
          sessionId,
          role: "guest",
          token,
        })
        if (cancelled) {
          return
        }
        const nextPeer = factoryRef.current({
          role: "guest",
          sessionId,
          signalPath: `/api/pedal/sessions/${sessionId}/signal`,
          token,
          iceConfiguration: {
            iceServers: ice.iceServers,
            iceTransportPolicy: ice.iceTransportPolicy,
          },
          onStatusChange: (nextStatus) => {
            setStatus(nextStatus)
            if (nextStatus === "failed") {
              setError("The pedal connection was lost. Create a new code on your computer.")
            }
          },
        })
        peer.current = nextPeer
        nextPeer.start()
      } catch {
        setError("The pedal service is unavailable. Try creating a new code on your computer.")
        setStatus("failed")
      }
    }

    void connect()

    return () => {
      cancelled = true
      peer.current?.close()
      peer.current = null
    }
  }, [sessionId])

  const label =
    status === "connected"
      ? "Connected · WebRTC"
      : status === "reconnecting"
        ? "Reconnecting"
        : status === "failed"
          ? "Connection lost"
          : "Connecting"

  return (
    <div className="relative min-h-svh">
      <PedalSurface
        key={status}
        connected={status === "connected"}
        connectionLabel={label}
        controller={pressController}
      />
      {error ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-4">
          <Alert variant="destructive">
            <AlertTitle>Pedal unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      ) : null}
    </div>
  )
}
