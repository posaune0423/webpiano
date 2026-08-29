"use client"

import { Smartphone } from "lucide-react"
import { useRef, useState } from "react"

import { PedalConnectDialog } from "@/components/pedal-connect-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Kbd } from "@/components/ui/kbd"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface PedalMenuProps {
  onPhonePedalChange: (down: boolean) => void
  onSustainLockChange: (enabled: boolean) => void
  remotePedalDown: boolean
  sustainActive: boolean
  sustainLocked: boolean
}

function PedalStatusBadge({
  remotePedalDown,
  sustainActive,
  sustainLocked,
}: Pick<PedalMenuProps, "remotePedalDown" | "sustainActive" | "sustainLocked">) {
  const source =
    remotePedalDown && sustainLocked
      ? "phone-lock"
      : remotePedalDown
        ? "phone"
        : sustainLocked
          ? "lock"
          : "none"
  const statusText = !sustainActive
    ? "Pedal off"
    : source === "phone-lock"
      ? "Pedal on · Phone + Lock"
      : source === "phone"
        ? "Pedal on · Phone"
        : source === "lock"
          ? "Pedal on · Lock"
          : "Pedal on"
  const accessibleLabel = !sustainActive
    ? "Pedal status: off"
    : source === "phone-lock"
      ? "Pedal status: on from phone pedal and Sustain Lock"
      : source === "phone"
        ? "Pedal status: on from phone pedal"
        : source === "lock"
          ? "Pedal status: on from Sustain Lock"
          : "Pedal status: on"

  return (
    <Badge
      aria-label={accessibleLabel}
      className="h-5 w-40"
      data-pedal-active={sustainActive}
      data-pedal-source={source}
      data-pedal-status=""
      role="note"
      variant={sustainActive ? "secondary" : "outline"}
    >
      <span className="font-mono text-[0.625rem] tracking-[0.08em] uppercase">{statusText}</span>
    </Badge>
  )
}

function PedalIcon({ active = false, locked = false }: { active?: boolean; locked?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      data-icon="inline-start"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      <path d="M7 3v8" />
      <rect height="10" rx="1.5" width="6" x="4" y="10" />
      <path d="M17 3v5" />
      <rect height="13" rx="1.5" width="6" x="14" y="7" />
      <circle cx="20.5" cy="19.5" fill={active ? "currentColor" : "none"} r="1.25" />
      <g data-pedal-lock={locked ? "locked" : "unlocked"}>
        <rect
          fill={locked ? "currentColor" : "var(--background)"}
          height="5"
          rx="1"
          width="6.5"
          x="15.75"
          y="17"
        />
        <path
          d={
            locked
              ? "M17.25 17v-1.1a1.75 1.75 0 0 1 3.5 0V17"
              : "M17.25 17v-1.1a1.75 1.75 0 0 1 3.2-1"
          }
        />
        {locked ? (
          <circle cx="19" cy="19.5" fill="var(--background)" r="0.5" stroke="none" />
        ) : null}
      </g>
    </svg>
  )
}

export function PedalMenu({
  onPhonePedalChange,
  onSustainLockChange,
  remotePedalDown,
  sustainActive,
  sustainLocked,
}: PedalMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  function closeMenu() {
    setMenuOpen(false)
    queueMicrotask(() => triggerRef.current?.focus())
  }

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                render={
                  <Button
                    ref={triggerRef}
                    aria-label="Pedal"
                    data-sustain-active={sustainActive}
                    data-sustain-locked={sustainLocked}
                    size="icon"
                    variant={sustainActive ? "secondary" : "outline"}
                  />
                }
              />
            }
          >
            <PedalIcon active={sustainActive} locked={sustainLocked} />
          </TooltipTrigger>
          <TooltipContent>
            Pedal ·{" "}
            {remotePedalDown && sustainLocked
              ? "Phone pedal down + Sustain locked"
              : remotePedalDown
                ? "Phone pedal down"
                : sustainLocked
                  ? "Sustain locked"
                  : `Sustain ${sustainActive ? "on" : "off"}`}
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-center justify-between gap-2 font-mono tracking-[0.14em] uppercase">
              <span>Pedal</span>
              <PedalStatusBadge
                remotePedalDown={remotePedalDown}
                sustainActive={sustainActive}
                sustainLocked={sustainLocked}
              />
            </DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={sustainLocked}
              className="min-h-12 gap-2"
              onCheckedChange={(enabled) => {
                onSustainLockChange(enabled)
                closeMenu()
              }}
            >
              <PedalIcon active={sustainLocked} locked={sustainLocked} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center justify-between gap-2">
                  <span>Sustain lock</span>
                  <Kbd>Space</Kbd>
                </span>
                <span className="text-[0.625rem] text-muted-foreground">
                  Keep sustain on until switched off
                </span>
              </span>
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="min-h-12 gap-2"
              onClick={() => {
                closeMenu()
                setPhoneDialogOpen(true)
              }}
            >
              <Smartphone aria-hidden="true" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span>Use phone as pedal</span>
                <span className="text-[0.625rem] text-muted-foreground">
                  Connect with a QR code
                </span>
              </span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <PedalConnectDialog
        open={phoneDialogOpen}
        showTrigger={false}
        onOpenChange={setPhoneDialogOpen}
        onPedalChange={onPhonePedalChange}
      />
    </>
  )
}
