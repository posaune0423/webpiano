"use client"

import { Smartphone } from "lucide-react"
import { useRef, useState } from "react"

import { PedalConnectDialog } from "@/components/pedal-connect-dialog"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface PedalMenuProps {
  onPhonePedalChange: (down: boolean) => void
  onSustainLockChange: (enabled: boolean) => void
  sustainLocked: boolean
}

function PedalIcon() {
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
    </svg>
  )
}

export function PedalMenu({
  onPhonePedalChange,
  onSustainLockChange,
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
                  <Button ref={triggerRef} aria-label="Pedal" size="icon" variant="outline" />
                }
              />
            }
          >
            <PedalIcon />
          </TooltipTrigger>
          <TooltipContent>Pedal</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-mono tracking-[0.14em] uppercase">
              Pedal
            </DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={sustainLocked}
              className="min-h-12 gap-2"
              onCheckedChange={(enabled) => {
                onSustainLockChange(enabled)
                closeMenu()
              }}
            >
              <PedalIcon />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span>Sustain lock</span>
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
