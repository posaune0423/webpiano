import { RotateCw, Smartphone } from "lucide-react"
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  FULL_PIANO_KEYS,
  FULL_PIANO_MIN_MIDI,
  LOWER_RANGE_NOTE_COUNT,
  MAX_LOWER_START_MIDI,
  MAX_STANDARD_START_MIDI,
  MAX_UPPER_START_MIDI,
  STANDARD_RANGE_NOTE_COUNT,
  UPPER_RANGE_NOTE_COUNT,
  formatPianoRange,
  getClosestFullPianoMidi,
  getFullPianoRangeBounds,
} from "@/lib/piano"
import type { PianoKey, PianoZone } from "@/lib/piano"
import { cn } from "@/lib/utils"

const FULL_WHITE_KEY_COUNT = 52

interface PianoKeyboardProps {
  activeNotes: ReadonlySet<number>
  keys: PianoKey[]
  label: string
  onAssistiveClick: (key: PianoKey, event: ReactMouseEvent<HTMLButtonElement>) => void
  onKeyButtonDown: (key: PianoKey, event: ReactKeyboardEvent<HTMLButtonElement>) => void
  onKeyButtonUp: (key: PianoKey, event: ReactKeyboardEvent<HTMLButtonElement>) => void
  onPointerDown: (key: PianoKey, event: ReactPointerEvent<HTMLButtonElement>) => void
  onPointerRelease: (event: ReactPointerEvent<HTMLButtonElement>) => void
  variant: "standard" | "zone"
}

interface DualRangeViewProps extends Omit<PianoKeyboardProps, "keys" | "label" | "variant"> {
  lowerKeys: PianoKey[]
  lowerStartMidi: number
  onRangeChange: (zone: PianoZone, startMidi: number) => void
  upperKeys: PianoKey[]
  upperStartMidi: number
}

function PianoKeyboard({
  activeNotes,
  keys,
  label,
  onAssistiveClick,
  onKeyButtonDown,
  onKeyButtonUp,
  onPointerDown,
  onPointerRelease,
  variant,
}: PianoKeyboardProps) {
  const whiteKeys = keys.filter((key) => !key.isBlack)
  const blackKeys = keys.filter((key) => key.isBlack)
  const whiteKeyWidth = 100 / whiteKeys.length
  const blackKeyWidth = whiteKeyWidth * 0.62

  function renderKey(key: PianoKey) {
    const active = activeNotes.has(key.midi)

    return (
      <button
        key={`${key.zone}:${key.midi}`}
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
                left: `${(key.whiteIndex + 1) * whiteKeyWidth - blackKeyWidth / 2}%`,
                width: `${blackKeyWidth}%`,
              }
            : undefined
        }
        onPointerCancel={onPointerRelease}
        onPointerDown={(event) => onPointerDown(key, event)}
        onPointerUp={onPointerRelease}
        onClick={(event) => onAssistiveClick(key, event)}
        onKeyDown={(event) => onKeyButtonDown(key, event)}
        onKeyUp={(event) => onKeyButtonUp(key, event)}
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
              "grid h-6 min-w-6 place-items-center rounded-sm border px-1 text-[0.625rem] font-bold whitespace-nowrap",
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
    <fieldset
      className={cn(
        "overflow-hidden rounded-md border border-border bg-lacquer p-0",
        variant === "standard"
          ? "min-h-[23rem] min-w-[52rem] flex-1 [@media(max-height:500px)]:min-h-[14rem]"
          : "min-h-0 min-w-0",
      )}
    >
      <legend className="sr-only">{label}</legend>
      <div
        className={cn(
          "relative h-full",
          variant === "standard"
            ? "min-h-[23rem] [@media(max-height:500px)]:min-h-[14rem]"
            : "min-h-0",
        )}
      >
        <div className="absolute inset-0 flex">{whiteKeys.map(renderKey)}</div>
        {blackKeys.map(renderKey)}
      </div>
    </fieldset>
  )
}

function RangeStepper({
  maximumStartMidi,
  noteCount,
  onRangeChange,
  startMidi,
  zone,
}: {
  maximumStartMidi: number
  noteCount: number
  onRangeChange: (startMidi: number) => void
  startMidi: number
  zone: PianoZone | "standard"
}) {
  const zoneLabel = zone === "standard" ? "Standard" : zone === "lower" ? "Lower" : "Upper"

  return (
    <div className="flex items-center overflow-hidden rounded-sm border border-border bg-background">
      <Button
        aria-label={`${zoneLabel} semitone down`}
        disabled={startMidi === FULL_PIANO_MIN_MIDI}
        size="icon-xs"
        variant="ghost"
        onClick={() => onRangeChange(startMidi - 1)}
      >
        −
      </Button>
      <output
        aria-label={`${zoneLabel} range`}
        className="grid h-6 min-w-16 place-items-center border-x border-border px-1 font-mono text-[0.5625rem] tracking-[0.06em] text-brass"
      >
        {formatPianoRange(startMidi, noteCount)}
      </output>
      <Button
        aria-label={`${zoneLabel} semitone up`}
        disabled={startMidi === maximumStartMidi}
        size="icon-xs"
        variant="ghost"
        onClick={() => onRangeChange(startMidi + 1)}
      >
        ＋
      </Button>
    </div>
  )
}

function FullPianoNavigator({
  activeNotes,
  lowerStartMidi,
  onRangeChange,
  upperStartMidi,
}: {
  activeNotes: ReadonlySet<number>
  lowerStartMidi: number
  onRangeChange: (zone: PianoZone, startMidi: number) => void
  upperStartMidi: number
}) {
  const [drag, setDrag] = useState<{
    offsetMidi: number
    pointerId: number
    previewStartMidi: number
    zone: PianoZone
  }>()
  const figureRef = useRef<HTMLElement>(null)
  const whiteKeys = FULL_PIANO_KEYS.filter((key) => !key.isBlack)
  const blackKeys = FULL_PIANO_KEYS.filter((key) => key.isBlack)
  const whiteKeyWidth = 100 / FULL_WHITE_KEY_COUNT
  const blackKeyWidth = whiteKeyWidth * 0.62

  function midiAtPointer(clientX: number): number {
    const bounds = figureRef.current?.getBoundingClientRect()

    if (!bounds || bounds.width === 0) return FULL_PIANO_MIN_MIDI

    return getClosestFullPianoMidi(((clientX - bounds.left) / bounds.width) * 100)
  }

  function rangeStyle(startMidi: number, noteCount: number) {
    const bounds = getFullPianoRangeBounds(startMidi, noteCount)

    return {
      left: `${bounds.leftPercent}%`,
      width: `${bounds.widthPercent}%`,
    }
  }

  function beginDrag(
    zone: PianoZone,
    startMidi: number,
    event: ReactPointerEvent<HTMLInputElement>,
  ) {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({
      offsetMidi: midiAtPointer(event.clientX) - startMidi,
      pointerId: event.pointerId,
      previewStartMidi: startMidi,
      zone,
    })
  }

  function moveDrag(event: ReactPointerEvent<HTMLInputElement>) {
    if (!drag || drag.pointerId !== event.pointerId) return

    const maximumStart = drag.zone === "lower" ? MAX_LOWER_START_MIDI : MAX_UPPER_START_MIDI
    const previewStartMidi = Math.min(
      maximumStart,
      Math.max(FULL_PIANO_MIN_MIDI, midiAtPointer(event.clientX) - drag.offsetMidi),
    )
    setDrag((current) => (current ? { ...current, previewStartMidi } : current))
  }

  function finishDrag(event: ReactPointerEvent<HTMLInputElement>) {
    if (!drag || drag.pointerId !== event.pointerId) return

    if (drag.previewStartMidi !== (drag.zone === "lower" ? lowerStartMidi : upperStartMidi)) {
      onRangeChange(drag.zone, drag.previewStartMidi)
    }
    setDrag(undefined)
  }

  function cancelDrag(event: ReactPointerEvent<HTMLInputElement>) {
    if (drag?.pointerId === event.pointerId) setDrag(undefined)
  }

  function handleRangeKeyDown(
    zone: PianoZone,
    startMidi: number,
    event: ReactKeyboardEvent<HTMLInputElement>,
  ) {
    const maximumStart = zone === "lower" ? MAX_LOWER_START_MIDI : MAX_UPPER_START_MIDI
    const nextStart =
      event.key === "ArrowLeft"
        ? Math.max(FULL_PIANO_MIN_MIDI, startMidi - 1)
        : event.key === "ArrowRight"
          ? Math.min(maximumStart, startMidi + 1)
          : event.key === "Home"
            ? FULL_PIANO_MIN_MIDI
            : event.key === "End"
              ? maximumStart
              : undefined

    if (nextStart === undefined || nextStart === startMidi) return

    event.preventDefault()
    onRangeChange(zone, nextStart)
  }

  function renderRange(zone: PianoZone, committedStartMidi: number, noteCount: number) {
    const isDragging = drag?.zone === zone
    const startMidi = isDragging ? drag.previewStartMidi : committedStartMidi
    const maximumStart = zone === "lower" ? MAX_LOWER_START_MIDI : MAX_UPPER_START_MIDI
    const zoneLabel = zone === "lower" ? "Lower" : "Upper"

    return (
      <div
        className={cn(
          "absolute inset-y-1 z-[3] border bg-background/15 text-left shadow-inner select-none data-[dragging=true]:bg-background/25",
          zone === "lower" ? "border-brass" : "border-muted-foreground",
        )}
        data-dragging={isDragging}
        style={rangeStyle(startMidi, noteCount)}
      >
        <input
          readOnly
          type="range"
          aria-label={`Move ${zoneLabel} range`}
          aria-valuemax={maximumStart}
          aria-valuemin={FULL_PIANO_MIN_MIDI}
          aria-valuenow={startMidi}
          aria-valuetext={`${zoneLabel} range ${formatPianoRange(startMidi, noteCount)}`}
          className="absolute inset-0 z-10 size-full cursor-grab touch-none appearance-none opacity-0 active:cursor-grabbing"
          data-dragging={isDragging}
          data-start-midi={startMidi}
          data-zone={zone}
          max={maximumStart}
          min={FULL_PIANO_MIN_MIDI}
          value={startMidi}
          onKeyDown={(event) => handleRangeKeyDown(zone, committedStartMidi, event)}
          onPointerCancel={cancelDrag}
          onPointerDown={(event) => beginDrag(zone, committedStartMidi, event)}
          onPointerMove={moveDrag}
          onPointerUp={finishDrag}
        />
        <span
          className={cn(
            "absolute left-1 flex items-center gap-1 border border-border bg-lacquer/95 px-1.5 py-1 font-mono text-[0.5rem] tracking-[0.06em] text-ivory uppercase",
            zone === "lower" ? "top-1" : "bottom-1",
          )}
        >
          <span aria-hidden="true" className="tracking-[-0.08em] text-muted-foreground">
            ⠿
          </span>
          {zoneLabel} · {formatPianoRange(startMidi, noteCount)}
        </span>
        {isDragging ? (
          <span className="absolute top-1/2 left-1/2 -translate-1/2 rounded-sm border border-border bg-lacquer px-2 py-1 text-center font-mono text-[0.5rem] leading-4 text-ivory uppercase shadow-lg">
            {formatPianoRange(startMidi, noteCount)}
            <br />
            Release to apply
          </span>
        ) : null}
      </div>
    )
  }

  return (
    <figure
      ref={figureRef}
      aria-label="Full piano range from A0 to C8"
      className="relative aspect-[8.2/1] w-full overflow-hidden rounded-sm border border-border bg-lacquer shadow-inner"
    >
      <div aria-hidden="true" className="absolute inset-1 flex">
        {whiteKeys.map((key) => (
          <span
            key={key.midi}
            data-active={activeNotes.has(key.midi)}
            data-midi={key.midi}
            className="relative flex-1 border-r border-border/65 bg-ivory shadow-[var(--shadow-key-white)] data-[active=true]:bg-primary"
          />
        ))}
      </div>
      <div aria-hidden="true">
        {blackKeys.map((key) => (
          <span
            key={key.midi}
            data-active={activeNotes.has(key.midi)}
            data-midi={key.midi}
            className="absolute top-1 z-[2] h-[60%] rounded-b-[2px] border border-border bg-lacquer shadow-[var(--shadow-key-black)] data-[active=true]:bg-secondary"
            style={{
              left: `${(key.whiteIndex + 1) * whiteKeyWidth - blackKeyWidth / 2}%`,
              width: `${blackKeyWidth}%`,
            }}
          />
        ))}
      </div>
      {renderRange("lower", lowerStartMidi, LOWER_RANGE_NOTE_COUNT)}
      {renderRange("upper", upperStartMidi, UPPER_RANGE_NOTE_COUNT)}
      <span className="absolute right-2 bottom-1 z-[4] font-mono text-[0.5rem] tracking-[0.08em] text-lacquer uppercase [@media(max-height:500px)]:hidden">
        A0 — C8 · 88 keys
      </span>
    </figure>
  )
}

export function DualRangeView({
  activeNotes,
  lowerKeys,
  lowerStartMidi,
  onAssistiveClick,
  onKeyButtonDown,
  onKeyButtonUp,
  onRangeChange,
  onPointerDown,
  onPointerRelease,
  upperKeys,
  upperStartMidi,
}: DualRangeViewProps) {
  const inputProps = {
    activeNotes,
    onAssistiveClick,
    onKeyButtonDown,
    onKeyButtonUp,
    onPointerDown,
    onPointerRelease,
  }

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 [@media(max-height:500px)]:gap-1.5">
      <FullPianoNavigator
        activeNotes={activeNotes}
        lowerStartMidi={lowerStartMidi}
        upperStartMidi={upperStartMidi}
        onRangeChange={onRangeChange}
      />
      <div className="grid min-h-0 grid-cols-2 gap-3 [@media(max-height:500px)]:gap-2">
        <div className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-1.5 [@media(max-height:500px)]:gap-0.5">
          <div className="flex min-h-8 items-center justify-between gap-2 px-0.5 font-mono uppercase [@media(max-height:500px)]:min-h-7">
            <div className="flex items-baseline gap-2">
              <span className="text-[0.625rem] tracking-[0.1em] text-brass">Lower</span>
              <span className="text-[0.5625rem] tracking-[0.08em] text-muted-foreground [@media(max-height:500px)]:hidden">
                Z–/
              </span>
            </div>
            <RangeStepper
              maximumStartMidi={MAX_LOWER_START_MIDI}
              noteCount={LOWER_RANGE_NOTE_COUNT}
              startMidi={lowerStartMidi}
              zone="lower"
              onRangeChange={(startMidi) => onRangeChange("lower", startMidi)}
            />
          </div>
          <PianoKeyboard
            {...inputProps}
            keys={lowerKeys}
            label="Lower playable piano"
            variant="zone"
          />
        </div>
        <div className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-1.5 [@media(max-height:500px)]:gap-0.5">
          <div className="flex min-h-8 items-center justify-between gap-2 px-0.5 font-mono uppercase [@media(max-height:500px)]:min-h-7">
            <div className="flex items-baseline gap-2">
              <span className="text-[0.625rem] tracking-[0.1em] text-ivory">Upper</span>
              <span className="text-[0.5625rem] tracking-[0.08em] text-muted-foreground [@media(max-height:500px)]:hidden">
                Q–]
              </span>
            </div>
            <RangeStepper
              maximumStartMidi={MAX_UPPER_START_MIDI}
              noteCount={UPPER_RANGE_NOTE_COUNT}
              startMidi={upperStartMidi}
              zone="upper"
              onRangeChange={(startMidi) => onRangeChange("upper", startMidi)}
            />
          </div>
          <PianoKeyboard
            {...inputProps}
            keys={upperKeys}
            label="Upper playable piano"
            variant="zone"
          />
        </div>
      </div>
    </div>
  )
}

export function StandardPianoView({
  onRangeChange,
  startMidi,
  ...props
}: Omit<PianoKeyboardProps, "label" | "variant"> & {
  onRangeChange: (startMidi: number) => void
  startMidi: number
}) {
  return (
    <div className="relative flex min-w-[52rem] flex-1">
      <div className="absolute top-2 left-1/2 z-10 -translate-x-1/2">
        <RangeStepper
          maximumStartMidi={MAX_STANDARD_START_MIDI}
          noteCount={STANDARD_RANGE_NOTE_COUNT}
          startMidi={startMidi}
          zone="standard"
          onRangeChange={onRangeChange}
        />
      </div>
      <PianoKeyboard {...props} label="Playable piano" variant="standard" />
    </div>
  )
}

export function OrientationGuide() {
  return (
    <section
      aria-label="Landscape orientation required"
      className="portrait-orientation-guide min-h-svh bg-background p-8 text-center text-foreground"
    >
      <span className="absolute top-5 left-5 font-heading text-3xl font-medium tracking-tight">
        webpiano
      </span>
      <div className="flex max-w-sm flex-col items-center gap-4">
        <div className="relative grid size-28 place-items-center text-brass" aria-hidden="true">
          <Smartphone className="size-16 rotate-90" />
          <RotateCw className="absolute right-0 bottom-0 size-7" />
        </div>
        <SeparatorLine />
        <h2 className="text-2xl tracking-tight">Turn your device sideways</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          webpiano is designed for landscape performance.
        </p>
      </div>
    </section>
  )
}

function SeparatorLine() {
  return <span aria-hidden="true" className="h-px w-10 bg-brass" />
}
