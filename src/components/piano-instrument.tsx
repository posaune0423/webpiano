"use client"

import { Volume2, VolumeX } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react"

import { PedalMenu } from "@/components/pedal-menu"
import {
  DualRangeView,
  OrientationGuide,
  StandardPianoView,
} from "@/components/piano-keyboard-view"
import { PwaInstallDrawer } from "@/components/pwa-install-drawer"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DEFAULT_LOWER_START_MIDI,
  DEFAULT_UPPER_START_MIDI,
  FULL_PIANO_MIN_MIDI,
  LOWER_RANGE_NOTE_COUNT,
  MAX_STANDARD_START_MIDI,
  STANDARD_RANGE_NOTE_COUNT,
  UPPER_RANGE_NOTE_COUNT,
  createPianoLayout,
  createStandardPianoLayout,
  formatPianoRange,
  getPianoKeyByCode,
} from "@/lib/piano"
import type { PianoKey, PianoZone } from "@/lib/piano"
import { getPianoAudioEngine } from "@/lib/piano-audio"
import { SustainSources } from "@/lib/piano-sustain"
import type { SustainSource } from "@/lib/piano-sustain"

const VELOCITY = 0.68

type AudioStatus = "idle" | "on" | "unavailable"
type InstrumentMode = "dual-range" | "standard"

function DualRangeIcon() {
  return (
    <svg
      aria-hidden="true"
      data-dual-range-icon=""
      data-icon="inline-start"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      <rect height="6" rx="1" width="12" x="3" y="4" />
      <path d="M6 4v6M9 4v6M12 4v6" />
      <rect height="6" rx="1" width="12" x="9" y="14" />
      <path d="M12 14v6M15 14v6M18 14v6" />
    </svg>
  )
}

function SingleRangeIcon() {
  return (
    <svg
      aria-hidden="true"
      data-single-range-icon=""
      data-icon="inline-start"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      <rect height="10" rx="1" width="18" x="3" y="7" />
      <path d="M7 7v10M11 7v10M15 7v10M19 7v10" />
    </svg>
  )
}

function SoundToggle({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  const label = muted ? "Unmute sound" : "Mute sound"

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            aria-pressed={muted}
            size="icon"
            variant={muted ? "secondary" : "outline"}
            onClick={onToggle}
          />
        }
      >
        {muted ? (
          <VolumeX aria-hidden="true" data-icon="inline-start" data-sound-icon="muted" />
        ) : (
          <Volume2 aria-hidden="true" data-icon="inline-start" data-sound-icon="on" />
        )}
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
  const [instrumentMode, setInstrumentMode] = useState<InstrumentMode>("standard")
  const [lowerStartMidi, setLowerStartMidi] = useState(DEFAULT_LOWER_START_MIDI)
  const [muted, setMuted] = useState(false)
  const [standardStartMidi, setStandardStartMidi] = useState(DEFAULT_LOWER_START_MIDI)
  const [sustain, setSustainState] = useState(false)
  const [sustainLocked, setSustainLocked] = useState(false)
  const [upperStartMidi, setUpperStartMidi] = useState(DEFAULT_UPPER_START_MIDI)
  const activationTimers = useRef(new Map<number, number>())
  const engineStarted = useRef(false)
  const noteSources = useRef(new Map<number, Set<string>>())
  const pressedCodes = useRef(new Set<string>())
  const pointerNotes = useRef(new Map<number, number>())
  const sustainLockedRef = useRef(false)
  const sustainSources = useRef<SustainSources | null>(null)

  sustainSources.current ??= new SustainSources((enabled) => {
    setSustainState(enabled)
    engineStarted.current = true
    getPianoAudioEngine().setSustain(enabled)
  })

  const dualRangeLayout = useMemo(
    () => createPianoLayout({ lowerStartMidi, upperStartMidi }),
    [lowerStartMidi, upperStartMidi],
  )
  const standardLayout = useMemo(
    () => createStandardPianoLayout(standardStartMidi),
    [standardStartMidi],
  )
  const activeLayout = instrumentMode === "dual-range" ? dualRangeLayout : standardLayout
  const activeLayoutRef = useRef(activeLayout)
  const instrumentModeRef = useRef(instrumentMode)
  const standardStartMidiRef = useRef(standardStartMidi)

  useEffect(() => {
    activeLayoutRef.current = activeLayout
    instrumentModeRef.current = instrumentMode
    standardStartMidiRef.current = standardStartMidi
  }, [activeLayout, instrumentMode, standardStartMidi])

  const sustainLabel = sustainLocked
    ? "Sustain locked"
    : sustain
      ? "Sustain on"
      : "Sustain off — press Space or use phone pedal"
  const audioLabel = muted
    ? "Sound muted"
    : audioStatus === "idle"
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

  const setSustain = useCallback((source: SustainSource, enabled: boolean) => {
    sustainSources.current?.set(source, enabled)
  }, [])

  const resetInstrument = useCallback((updateVisualState: boolean, preserveManualLock = false) => {
    for (const timer of activationTimers.current.values()) {
      window.clearTimeout(timer)
    }

    activationTimers.current.clear()
    noteSources.current.clear()
    pointerNotes.current.clear()
    pressedCodes.current.clear()
    if (updateVisualState) {
      if (preserveManualLock) {
        sustainSources.current?.clear("keyboard")
        sustainSources.current?.clear("remote-pedal")
      } else {
        sustainSources.current?.clearAll()
        sustainLockedRef.current = false
        setSustainLocked(false)
      }
    }

    if (engineStarted.current) {
      getPianoAudioEngine().allNotesOff()
    }

    if (updateVisualState) {
      setActiveNotes(new Set())
      setSustainState(sustainSources.current?.active ?? false)
    }
  }, [])

  const setManualSustainLock = useCallback(
    (enabled: boolean) => {
      sustainLockedRef.current = enabled
      setSustainLocked(enabled)
      setSustain("manual-lock", enabled)
    },
    [setSustain],
  )

  // Synchronize the instrument with browser-global keyboard and focus events.
  // https://react.dev/learn/you-might-not-need-an-effect#synchronizing-with-external-systems
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (event.code === "Space") {
        event.preventDefault()
        if (!event.repeat) {
          setManualSustainLock(!sustainLockedRef.current)
        }
        return
      }

      if (
        instrumentModeRef.current === "standard" &&
        (event.code === "ArrowLeft" || event.code === "ArrowRight")
      ) {
        event.preventDefault()
        const delta = event.code === "ArrowLeft" ? -1 : 1
        const nextStartMidi = Math.min(
          MAX_STANDARD_START_MIDI,
          Math.max(FULL_PIANO_MIN_MIDI, standardStartMidiRef.current + delta),
        )

        if (nextStartMidi !== standardStartMidiRef.current) {
          resetInstrument(true, true)
          standardStartMidiRef.current = nextStartMidi
          setStandardStartMidi(nextStartMidi)
        }
        return
      }

      const key = getPianoKeyByCode(event.code, activeLayoutRef.current)

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
        return
      }

      const key = getPianoKeyByCode(event.code, activeLayoutRef.current)

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
      getPianoAudioEngine().setMuted(false)
    }
  }, [pressNote, releaseNote, resetInstrument, setManualSustainLock])

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

  function handleModeChange(nextMode: InstrumentMode) {
    if (nextMode === instrumentMode) return

    resetInstrument(true, true)
    instrumentModeRef.current = nextMode
    setInstrumentMode(nextMode)
  }

  function handleMuteToggle() {
    const nextMuted = !muted
    getPianoAudioEngine().setMuted(nextMuted)
    setMuted(nextMuted)
  }

  function handleRangeChange(zone: PianoZone, startMidi: number) {
    resetInstrument(true, true)
    if (zone === "lower") setLowerStartMidi(startMidi)
    else setUpperStartMidi(startMidi)
  }

  function handleStandardRangeChange(startMidi: number) {
    resetInstrument(true, true)
    standardStartMidiRef.current = startMidi
    setStandardStartMidi(startMidi)
  }

  const pianoInputProps = {
    activeNotes,
    onAssistiveClick: handleAssistiveClick,
    onKeyButtonDown: handleKeyButtonDown,
    onKeyButtonUp: handleKeyButtonUp,
    onPointerDown: handlePointerDown,
    onPointerRelease: handlePointerRelease,
  }

  return (
    <div className="min-h-svh bg-background">
      <OrientationGuide />
      <main
        data-instrument-mode={instrumentMode}
        className="instrument-shell flex min-h-svh flex-col overflow-hidden bg-background text-foreground"
      >
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
            <PedalMenu
              sustainActive={sustain}
              sustainLocked={sustainLocked}
              onPhonePedalChange={(down) => setSustain("remote-pedal", down)}
              onSustainLockChange={(enabled) => {
                setManualSustainLock(enabled)
              }}
            />
            <ToggleGroup
              aria-label="Keyboard mode"
              size="sm"
              spacing={0}
              value={[instrumentMode]}
              variant="outline"
              onValueChange={(value) => {
                const nextMode = value.at(-1)
                if (nextMode === "standard" || nextMode === "dual-range") {
                  handleModeChange(nextMode)
                }
              }}
            >
              <ToggleGroupItem aria-label="Single keyboard" value="standard">
                <SingleRangeIcon />
                <span className="font-mono text-[0.5625rem] tracking-[0.1em] uppercase">
                  Single
                </span>
              </ToggleGroupItem>
              <ToggleGroupItem aria-label="Dual keyboard" value="dual-range">
                <DualRangeIcon />
                <span className="font-mono text-[0.5625rem] tracking-[0.1em] uppercase">Dual</span>
              </ToggleGroupItem>
            </ToggleGroup>
            <PwaInstallDrawer />
            <output className="sr-only" aria-label={sustainLabel} aria-live="polite" />
            <output className="sr-only" aria-label={audioLabel} aria-live="polite" />
            <SoundToggle muted={muted} onToggle={handleMuteToggle} />
          </div>
        </header>

        <Separator />

        <section className="flex min-h-0 flex-1 flex-col gap-3 px-3 py-3 sm:gap-5 sm:px-8 sm:py-7 lg:px-10 [@media(max-height:500px)]:gap-2 [@media(max-height:500px)]:px-3 [@media(max-height:500px)]:py-2">
          <div className="flex flex-wrap items-end justify-between gap-4 [@media(max-height:500px)]:hidden">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[0.625rem] tracking-[0.16em] text-brass uppercase">
                {instrumentMode === "standard" ? (
                  <>
                    <span className="inline-block w-14">
                      {formatPianoRange(standardStartMidi, STANDARD_RANGE_NOTE_COUNT)}
                    </span>
                    {` · ${STANDARD_RANGE_NOTE_COUNT} notes · ${LOWER_RANGE_NOTE_COUNT + UPPER_RANGE_NOTE_COUNT} keys`}
                  </>
                ) : (
                  "A0 — C8 navigator · 2 active ranges"
                )}
              </span>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Play this free online piano with your computer keyboard or touch. No download or
                sign-up.
              </p>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[0.625rem] tracking-[0.1em] text-muted-foreground uppercase">
              <span>Z–/ · lower reach</span>
              <span>Q–] · upper reach</span>
            </div>
          </div>

          <div className="grid min-h-[24rem] flex-1 overflow-hidden rounded-lg border border-border bg-card p-2 shadow-[var(--shadow-piano)] sm:p-3 [@media(max-height:500px)]:min-h-[15rem] [@media(max-height:500px)]:p-2">
            {instrumentMode === "standard" ? (
              <StandardPianoView
                {...pianoInputProps}
                keys={standardLayout.keys}
                startMidi={standardStartMidi}
                onRangeChange={handleStandardRangeChange}
              />
            ) : (
              <DualRangeView
                {...pianoInputProps}
                lowerKeys={dualRangeLayout.lowerKeys}
                lowerStartMidi={lowerStartMidi}
                upperKeys={dualRangeLayout.upperKeys}
                upperStartMidi={upperStartMidi}
                onRangeChange={handleRangeChange}
              />
            )}
          </div>
        </section>

        <Separator />
        <SiteFooter />
      </main>
    </div>
  )
}
