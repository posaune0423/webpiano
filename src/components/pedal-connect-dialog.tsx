"use client"

import { useMutation } from "@tanstack/react-query"
import { QRCodeSVG } from "qrcode.react"
import { useEffect, useRef, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { PedalPeer } from "@/lib/pedal-peer"
import type { PedalPeerOptions, PedalPeerPort } from "@/lib/pedal-peer"
import type { CreateSessionOutput } from "@/server/pedal/contracts"
import { useTRPC } from "@/trpc/client"

interface PedalConnectDialogProps {
  onPedalChange: (down: boolean) => void
  peerFactory?: (options: PedalPeerOptions) => PedalPeerPort
}

export function PedalConnectDialog(_props: PedalConnectDialogProps) {
  const { onPedalChange, peerFactory = (options) => new PedalPeer(options) } = _props
  const trpc = useTRPC()
  const createSession = useMutation(trpc.pedal.createSession.mutationOptions())
  const issueIceServers = useMutation(trpc.pedal.issueIceServers.mutationOptions())
  const endSession = useMutation(trpc.pedal.endSession.mutationOptions())
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string>()
  const [open, setOpen] = useState(false)
  const [pairingMinutes, setPairingMinutes] = useState<number>()
  const [session, setSession] = useState<CreateSessionOutput>()
  const [status, setStatus] = useState<
    "idle" | "creating" | "waiting" | "connecting" | "connected" | "reconnecting" | "failed"
  >("idle")
  const onPedalChangeRef = useRef(onPedalChange)
  const peer = useRef<PedalPeerPort | null>(null)
  const sessionGeneration = useRef(0)

  useEffect(() => {
    onPedalChangeRef.current = onPedalChange
  }, [onPedalChange])

  useEffect(
    () => () => {
      sessionGeneration.current += 1
      peer.current?.close()
      onPedalChangeRef.current(false)
    },
    [],
  )

  async function startSession() {
    if (createSession.isPending) {
      return
    }

    setError(undefined)
    setCopied(false)
    setStatus("creating")
    const generation = ++sessionGeneration.current

    try {
      const created = await createSession.mutateAsync()
      if (generation !== sessionGeneration.current) {
        return
      }
      const suppliedJoinUrl = new URL(created.joinUrl)
      const joinUrl = new URL(
        `${suppliedJoinUrl.pathname}${suppliedJoinUrl.search}${suppliedJoinUrl.hash}`,
        window.location.origin,
      ).toString()
      const browserSession = { ...created, joinUrl }
      setSession(browserSession)
      setPairingMinutes(
        Math.max(1, Math.ceil((Date.parse(created.pairingExpiresAt) - Date.now()) / 60_000)),
      )
      setStatus("waiting")
      const ice = await issueIceServers.mutateAsync({
        clientOrigin: window.location.origin,
        sessionId: created.sessionId,
        role: "host",
        token: created.hostToken,
      })
      if (generation !== sessionGeneration.current) {
        return
      }
      const nextPeer = peerFactory({
        role: "host",
        sessionId: created.sessionId,
        signalPath: created.signalPath,
        token: created.hostToken,
        iceConfiguration: {
          iceServers: ice.iceServers,
          iceTransportPolicy: ice.iceTransportPolicy,
        },
        onPedalChange: (down) => onPedalChangeRef.current(down),
        onStatusChange: (nextStatus) => {
          if (generation !== sessionGeneration.current) {
            return
          }
          if (nextStatus === "connected") {
            setStatus("connected")
            setOpen(false)
          } else if (nextStatus === "reconnecting") {
            setStatus("reconnecting")
          } else if (nextStatus === "failed") {
            onPedalChangeRef.current(false)
            setStatus("failed")
          } else if (nextStatus === "connecting") {
            setStatus("connecting")
          }
        },
      })
      peer.current = nextPeer
      nextPeer.start()
    } catch {
      if (generation !== sessionGeneration.current) {
        return
      }
      setStatus("failed")
      setError("The pedal connection could not be created. Check your connection and try again.")
    }
  }

  async function disconnect() {
    sessionGeneration.current += 1
    const currentSession = session
    peer.current?.close()
    peer.current = null
    onPedalChangeRef.current(false)
    setStatus("idle")
    setSession(undefined)
    setPairingMinutes(undefined)
    setCopied(false)
    setError(undefined)
    createSession.reset()
    issueIceServers.reset()

    if (currentSession) {
      try {
        await endSession.mutateAsync({
          sessionId: currentSession.sessionId,
          token: currentSession.hostToken,
        })
      } catch {
        // The local connection is already closed; the server session expires independently.
      }
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen && !session) {
      void startSession()
    } else if (!nextOpen && session && status !== "connected") {
      void disconnect()
    }
  }

  async function copyLink() {
    if (!session) {
      setError("Copy is unavailable. Select the link below instead.")
      return
    }

    try {
      await navigator.clipboard.writeText(session.joinUrl)
      setCopied(true)
    } catch {
      setError("Copy is unavailable. Select the link below instead.")
    }
  }

  const triggerLabel = status === "connected" ? "Pedal connected" : "Use phone as pedal"
  const displayedPairingMinutes = pairingMinutes ?? 1

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant={status === "connected" ? "secondary" : "outline"} />}>
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {status === "connected" ? "Phone pedal connected" : "Connect your phone"}
          </DialogTitle>
          <DialogDescription>
            {status === "connected"
              ? "Your phone is controlling sustain in real time."
              : "Scan this code with your phone. The link is temporary and expires in ten minutes."}
          </DialogDescription>
        </DialogHeader>

        {status === "creating" ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-muted-foreground">
            <Spinner />
            <span>Creating a private pedal session…</span>
          </div>
        ) : session && status !== "connected" ? (
          <div className="flex flex-col gap-4">
            <div className="mx-auto overflow-hidden rounded-md bg-ivory p-2">
              <QRCodeSVG
                value={session.joinUrl}
                size={224}
                level="M"
                marginSize={4}
                bgColor="var(--ivory)"
                fgColor="var(--lacquer)"
                title="QR code for phone pedal"
              />
            </div>

            <div className="flex flex-col gap-2">
              <code className="max-h-20 overflow-auto rounded-md border border-border bg-muted p-2 text-xs break-all">
                {session.joinUrl}
              </code>
              <Button variant="outline" onClick={() => void copyLink()}>
                {copied ? "Link copied" : "Copy link"}
              </Button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Badge variant={status === "failed" ? "outline" : "secondary"}>
                {status === "failed"
                  ? "Connection failed"
                  : status === "reconnecting"
                    ? "Reconnecting"
                    : status === "connecting"
                      ? "Connecting"
                      : "Waiting for phone"}
              </Badge>
              <time
                dateTime={session.pairingExpiresAt}
                className="font-mono text-[0.625rem] tracking-[0.08em] text-muted-foreground uppercase"
              >
                {displayedPairingMinutes} minute{displayedPairingMinutes === 1 ? "" : "s"} link
              </time>
            </div>
          </div>
        ) : status === "connected" ? (
          <div className="flex min-h-40 flex-col items-center justify-center gap-3">
            <span className="size-3 rounded-full bg-brass shadow-[0_0_1rem_var(--brass)]" />
            <Badge variant="secondary">Connected · WebRTC</Badge>
          </div>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Pedal unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          {status === "connected" ? (
            <Button variant="outline" onClick={() => void disconnect()}>
              Disconnect
            </Button>
          ) : status === "failed" ? (
            <Button
              variant="outline"
              onClick={() => {
                void disconnect().then(startSession)
              }}
            >
              Try again
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
