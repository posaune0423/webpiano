"use client"

import { Keyboard, Volume1, Volume2, VolumeX } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react"

import { PedalConnectDialog } from "@/components/pedal-connect-dialog"
import { SiteFooter } from "@/components/site-footer"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { PIANO_KEYS, getPianoKeyByCode } from "@/lib/piano"
import type { PianoKey } from "@/lib/piano"
import { getPianoAudioEngine } from "@/lib/piano-audio"
import { SustainSources } from "@/lib/piano-sustain"
import { cn } from "@/lib/utils"

const VELOCITY = 0.68
const WHITE_KEYS = PIANO_KEYS.filter((key) => !key.isBlack)
const BLACK_KEYS = PIANO_KEYS.filter((key) => key.isBlack)
const WHITE_KEY_WIDTH = 100 / WHITE_KEYS.length
const BLACK_KEY_WIDTH = WHITE_KEY_WIDTH * 0.62

type AudioStatus = "idle" | "on" | "unavailable"

interface InstrumentStatusProps {
  children: React.ReactNode
  label: string
  variant: "default" | "destructive" | "outline" | "secondary"
}

function InstrumentStatus({ children, label, variant }: InstrumentStatusProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge
            // Icon-only status needs a focus target so keyboard users can open its tooltip.
            // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            render={<output aria-label={label} aria-live="polite" tabIndex={0} />}
            variant={variant}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return target.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)
}

export function PianoInstrument({ structuredData }: { structuredData?: string }) {
  const [activeNotes, setActiveNotes] = useState<Set<number>>(() => new Set())
  const [audioStatus, setAudioStatus] = useState<AudioStatus>("idle")
  const [sustain, setSustainState] = useState(false)
  const activationTimers = useRef(new Map<number, number>())
  const engineStarted = useRef(false)
  const noteSources = useRef(new Map<number, Set<string>>())
  const pressedCodes = useRef(new Set<string>())
  const pointerNotes = useRef(new Map<number, number>())
  const sustainSources = useRef<SustainSources | null>(null)

  sustainSources.current ??= new SustainSources((enabled) => {
    setSustainState(enabled)
    engineStarted.current = true
    getPianoAudioEngine().setSustain(enabled)
  })

  const sustainLabel = sustain ? "Sustain on" : "Sustain off — hold Space or use phone pedal"
  const audioLabel =
    audioStatus === "idle"
      ? "Play a note to start audio"
      : audioStatus === "on"
        ? "Sound on"
        : "Audio unavailable"

  const pressNote = useCallback((midi: number, source: string) => {
    const sources = noteSources.current.get(midi) ?? new Set<string>()

    if (sources.has(source)) {
      return
    }

    const shouldStartVoice = sources.size === 0
    sources.add(source)
    noteSources.current.set(midi, sources)
    setActiveNotes((previous) => new Set(previous).add(midi))

    if (!shouldStartVoice) {
      return
    }

    engineStarted.current = true
    setAudioStatus("on")
    void getPianoAudioEngine()
      .noteOn(midi, VELOCITY)
      .catch(() => setAudioStatus("unavailable"))
  }, [])

  const releaseNote = useCallback((midi: number, source: string) => {
    const sources = noteSources.current.get(midi)

    if (!sources?.delete(source) || sources.size > 0) {
      return
    }

    noteSources.current.delete(midi)
    setActiveNotes((previous) => {
      const next = new Set(previous)
      next.delete(midi)
      return next
    })
    getPianoAudioEngine().noteOff(midi)
  }, [])

  const setSustain = useCallback((source: "keyboard" | "remote-pedal", enabled: boolean) => {
    sustainSources.current?.set(source, enabled)
  }, [])

  const resetInstrument = useCallback((updateVisualState: boolean) => {
    for (const timer of activationTimers.current.values()) {
      window.clearTimeout(timer)
    }

    activationTimers.current.clear()
    noteSources.current.clear()
    pointerNotes.current.clear()
    pressedCodes.current.clear()
    if (updateVisualState) {
      sustainSources.current?.clearAll()
    }

    if (engineStarted.current) {
      getPianoAudioEngine().allNotesOff()
    }

    if (updateVisualState) {
      setActiveNotes(new Set())
      setSustainState(false)
    }
  }, [])

  // Synchronize the instrument with browser-global keyboard and focus events.
  // https://react.dev/learn/you-might-not-need-an-effect#synchronizing-with-external-systems
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (event.code === "Space") {
        if (!event.repeat) {
          event.preventDefault()
          setSustain("keyboard", true)
        }
        return
      }

      const key = getPianoKeyByCode(event.code)

      if (!key || event.repeat || pressedCodes.current.has(event.code)) {
        return
      }

      event.preventDefault()
      pressedCodes.current.add(event.code)
      pressNote(key.midi, `keyboard:${event.code}`)
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") {
        event.preventDefault()
        setSustain("keyboard", false)
        return
      }

      const key = getPianoKeyByCode(event.code)

      if (!key || !pressedCodes.current.delete(event.code)) {
        return
      }

      event.preventDefault()
      releaseNote(key.midi, `keyboard:${event.code}`)
    }

    function handleBlur() {
      resetInstrument(true)
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    window.addEventListener("blur", handleBlur)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("blur", handleBlur)
      resetInstrument(false)
    }
  }, [pressNote, releaseNote, resetInstrument, setSustain])

  function handlePointerDown(key: PianoKey, event: ReactPointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    pointerNotes.current.set(event.pointerId, key.midi)
    pressNote(key.midi, `pointer:${event.pointerId}`)
  }

  function handlePointerRelease(event: ReactPointerEvent<HTMLButtonElement>) {
    const midi = pointerNotes.current.get(event.pointerId)

    if (midi === undefined) {
      return
    }

    pointerNotes.current.delete(event.pointerId)
    releaseNote(midi, `pointer:${event.pointerId}`)
  }

  function handleKeyButtonDown(key: PianoKey, event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.code !== "Enter" || event.repeat) {
      return
    }

    event.preventDefault()
    pressNote(key.midi, `button:${key.midi}`)
  }

  function handleKeyButtonUp(key: PianoKey, event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.code !== "Enter") {
      return
    }

    event.preventDefault()
    releaseNote(key.midi, `button:${key.midi}`)
  }

  function handleAssistiveClick(key: PianoKey, event: ReactMouseEvent<HTMLButtonElement>) {
    if (event.detail !== 0) {
      return
    }

    const source = `assistive:${key.midi}`
    const existingTimer = activationTimers.current.get(key.midi)

    if (existingTimer !== undefined) {
      window.clearTimeout(existingTimer)
    }

    pressNote(key.midi, source)
    activationTimers.current.set(
      key.midi,
      window.setTimeout(() => {
        activationTimers.current.delete(key.midi)
        releaseNote(key.midi, source)
      }, 240),
    )
  }

  function renderKey(key: PianoKey) {
    const active = activeNotes.has(key.midi)

    return (
      <button
        key={key.midi}
        type="button"
        aria-label={`Play ${key.note} with ${key.keyboardLabel}`}
        aria-pressed={active}
        className={cn(
          "group/key touch-pan-x select-none focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          key.isBlack
            ? "absolute top-0 z-[2] h-[62%] rounded-b-sm border border-border bg-lacquer text-ivory shadow-[var(--shadow-key-black)] active:translate-y-px"
            : "relative h-full flex-1 rounded-b-md border border-border/65 bg-ivory text-lacquer shadow-[var(--shadow-key-white)] active:bg-primary",
          active && (key.isBlack ? "translate-y-0.5 bg-secondary" : "bg-primary"),
        )}
        style={
          key.isBlack
            ? {
                left: `${(key.whiteIndex + 1) * WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2}%`,
                width: `${BLACK_KEY_WIDTH}%`,
              }
            : undefined
        }
        onPointerCancel={handlePointerRelease}
        onPointerDown={(event) => handlePointerDown(key, event)}
        onPointerUp={handlePointerRelease}
        onClick={(event) => handleAssistiveClick(key, event)}
        onKeyDown={(event) => handleKeyButtonDown(key, event)}
        onKeyUp={(event) => handleKeyButtonUp(key, event)}
      >
        <span
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-3 flex flex-col items-center gap-1 font-mono",
            key.isBlack ? "text-ivory/65" : "text-lacquer/60",
          )}
        >
          <span className="text-[0.5625rem] tracking-[0.08em]">{key.note}</span>
          <kbd
            className={cn(
              "grid size-6 place-items-center rounded-sm border text-[0.625rem] font-bold",
              key.isBlack ? "border-ivory/20" : "border-lacquer/20",
            )}
          >
            {key.keyboardLabel}
          </kbd>
        </span>
      </button>
    )
  }

  return (
    <main className="flex min-h-svh flex-col overflow-hidden bg-background text-foreground">
      {structuredData ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
      ) : null}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-4 lg:px-10 [@media(max-height:500px)]:py-2">
        <h1 className="flex items-center gap-4">
          <span className="font-heading text-3xl leading-none font-medium tracking-tight sm:text-4xl">
            webpiano
          </span>
          <span aria-hidden="true" className="h-6 w-px bg-border" />
          <span className="font-mono text-[0.5625rem] tracking-[0.14em] text-muted-foreground uppercase sm:text-[0.625rem] sm:tracking-[0.16em]">
            Online piano
          </span>
        </h1>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <PedalConnectDialog onPedalChange={(down) => setSustain("remote-pedal", down)} />
          <InstrumentStatus label={sustainLabel} variant={sustain ? "default" : "outline"}>
            <Keyboard aria-hidden="true" />
          </InstrumentStatus>
          <InstrumentStatus
            label={audioLabel}
            variant={audioStatus === "unavailable" ? "destructive" : "secondary"}
          >
            {audioStatus === "idle" ? (
              <Volume1 aria-hidden="true" />
            ) : audioStatus === "on" ? (
              <Volume2 aria-hidden="true" />
            ) : (
              <VolumeX aria-hidden="true" />
            )}
          </InstrumentStatus>
        </div>
      </header>

      <Separator />

      <section className="flex min-h-0 flex-1 flex-col gap-3 px-3 py-3 sm:gap-5 sm:px-8 sm:py-7 lg:px-10 [@media(max-height:500px)]:gap-2 [@media(max-height:500px)]:px-3 [@media(max-height:500px)]:py-2">
        <div className="flex flex-wrap items-end justify-between gap-4 [@media(max-height:500px)]:hidden">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[0.625rem] tracking-[0.16em] text-brass uppercase">
              C3 — B4 · 24 notes
            </span>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Play this free online piano with your computer keyboard or touch. No download or
              sign-up.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[0.625rem] tracking-[0.1em] text-muted-foreground uppercase">
            <span>Z–M · lower octave</span>
            <span>Q–U · upper octave</span>
          </div>
        </div>

        <div className="flex min-h-[24rem] flex-1 overflow-x-auto rounded-lg border border-border bg-card p-2 shadow-[var(--shadow-piano)] sm:p-3 [@media(max-height:500px)]:min-h-[15rem] [@media(max-height:500px)]:p-2">
          <fieldset className="min-h-[23rem] min-w-[52rem] flex-1 overflow-hidden rounded-md border border-border bg-lacquer p-0 [@media(max-height:500px)]:min-h-[14rem]">
            <legend className="sr-only">Playable piano</legend>
            <div className="relative h-full min-h-[23rem] [@media(max-height:500px)]:min-h-[14rem]">
              <div className="absolute inset-0 flex">{WHITE_KEYS.map(renderKey)}</div>
              {BLACK_KEYS.map(renderKey)}
            </div>
          </fieldset>
        </div>
      </section>

      <Separator />
      <SiteFooter />
    </main>
  )
}
