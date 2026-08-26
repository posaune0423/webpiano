"use client"

import { useEffect, useRef, useState } from "react"
import type { PointerEvent as ReactPointerEvent } from "react"

import { Badge } from "@/components/ui/badge"
import { PedalPressController } from "@/lib/pedal-press"
import { cn } from "@/lib/utils"

interface PedalSurfaceProps {
  connected: boolean
  connectionLabel: string
  controller?: PedalPressController
  onMessage?: (message: { v: 1; type: "pedal"; seq: number; down: boolean }) => void
}

export function PedalSurface({
  connected,
  connectionLabel,
  controller: providedController,
  onMessage,
}: PedalSurfaceProps) {
  const [pressed, setPressed] = useState(false)
  const wakeLock = useRef<WakeLockSentinel | null>(null)
  const [ownedController] = useState(() => new PedalPressController(onMessage ?? (() => undefined)))
  const controller = providedController ?? ownedController

  useEffect(() => {
    if (!pressed || !connected) {
      return
    }

    const heartbeat = window.setInterval(() => controller.heartbeat(), 250)
    return () => window.clearInterval(heartbeat)
  }, [connected, controller, pressed])

  useEffect(() => {
    function releasePedal() {
      controller.cancelAll()
      setPressed(false)
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        releasePedal()
      }
    }

    window.addEventListener("pagehide", releasePedal)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("pagehide", releasePedal)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      releasePedal()
      void wakeLock.current?.release()
    }
  }, [controller])

  function requestWakeLock() {
    if (!("wakeLock" in navigator) || wakeLock.current) {
      return
    }

    void navigator.wakeLock
      .request("screen")
      .then((sentinel) => {
        wakeLock.current = sentinel
        sentinel.addEventListener("release", () => {
          if (wakeLock.current === sentinel) {
            wakeLock.current = null
          }
        })
      })
      .catch(() => undefined)
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!connected) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    controller.press(event.pointerId)
    setPressed(controller.down)
    requestWakeLock()
  }

  function handlePointerRelease(event: ReactPointerEvent<HTMLButtonElement>) {
    controller.release(event.pointerId)
    setPressed(controller.down)
  }

  function handlePointerCancellation(event: ReactPointerEvent<HTMLButtonElement>) {
    controller.release(event.pointerId)
    setPressed(controller.down)
  }

  return (
    <main className="relative flex min-h-svh touch-none flex-col overflow-hidden bg-background text-foreground select-none">
      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl leading-none font-medium tracking-tight">
            webpiano
          </h1>
          <span className="font-mono text-[0.5625rem] tracking-[0.14em] text-muted-foreground uppercase">
            Sustain controller
          </span>
        </div>
        <Badge variant={connected ? "secondary" : "outline"} render={<output />}>
          <span
            aria-hidden="true"
            className={cn(
              "size-1.5 rounded-full bg-brass",
              !connected && "animate-pulse opacity-60",
            )}
          />
          {connectionLabel}
        </Badge>
      </header>

      <button
        type="button"
        aria-label="Sustain pedal"
        aria-pressed={pressed}
        disabled={!connected}
        className="group/pedal flex min-h-svh flex-1 touch-none items-center justify-center px-7 pt-20 pb-8 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:cursor-wait"
        onLostPointerCapture={handlePointerCancellation}
        onPointerCancel={handlePointerCancellation}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerRelease}
      >
        <span
          className={cn(
            "relative flex h-[72svh] max-h-[42rem] min-h-[28rem] w-full max-w-sm items-center justify-center transition-transform duration-150 ease-out",
            pressed ? "translate-y-3 scale-[0.985]" : "-translate-y-1",
          )}
        >
          <svg
            viewBox="0 0 300 520"
            aria-label={pressed ? "Pedal down" : "Pedal up"}
            className="h-full w-full drop-shadow-[0_2rem_2.5rem_var(--lacquer)]"
          >
            <defs>
              <linearGradient id="pedal-metal" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="var(--ivory)" />
                <stop offset="0.45" stopColor="var(--brass)" />
                <stop offset="1" stopColor="var(--muted-foreground)" />
              </linearGradient>
              <linearGradient id="pedal-face" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--card)" />
                <stop offset="1" stopColor="var(--lacquer)" />
              </linearGradient>
            </defs>
            <path
              d="M94 34h112l30 392c3 39-28 72-67 72h-38c-39 0-70-33-67-72L94 34Z"
              fill="url(#pedal-face)"
              stroke="var(--border)"
              strokeWidth="3"
            />
            <path
              d="M112 55h76l23 348c2 29-21 53-50 53h-22c-29 0-52-24-50-53l23-348Z"
              fill="url(#pedal-metal)"
              opacity={pressed ? 0.78 : 0.94}
            />
            <path
              d="M122 78h56l12 289c1 23-17 42-40 42s-41-19-40-42l12-289Z"
              fill="var(--ivory)"
              opacity="0.18"
            />
            <path d="M119 438h62" stroke="var(--lacquer)" strokeWidth="5" strokeLinecap="round" />
          </svg>
          <span className="absolute bottom-8 font-mono text-[0.625rem] tracking-[0.18em] text-muted-foreground uppercase">
            {pressed
              ? "Pedal down"
              : connected
                ? "Touch anywhere and hold"
                : "Waiting for connection"}
          </span>
        </span>
      </button>
    </main>
  )
}
