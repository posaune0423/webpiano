"use client"

import { Check, Download, MonitorDown, MoreHorizontal, Share2, X } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { usePwaInstall } from "@/hooks/use-pwa-install"

function InstallChecking() {
  return (
    <div aria-label="Checking install availability" className="flex h-full flex-col gap-3">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-8 w-4/5" />
    </div>
  )
}

function IosInstructions() {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="grid grid-cols-[1.75rem_1fr] items-center gap-2 text-sm text-muted-foreground">
        <span className="grid size-6 place-items-center rounded-full border border-border font-mono text-[0.625rem] text-foreground">
          1
        </span>
        <span className="flex items-center gap-1.5">
          Tap the browser’s <Share2 aria-hidden="true" className="size-4 text-foreground" /> Share
          button.
        </span>
      </div>
      <div className="grid grid-cols-[1.75rem_1fr] items-center gap-2 text-sm text-muted-foreground">
        <span className="grid size-6 place-items-center rounded-full border border-border font-mono text-[0.625rem] text-foreground">
          2
        </span>
        <span>
          Choose <strong className="font-medium text-foreground">Add to Home Screen</strong>.
        </span>
      </div>
      <div className="grid grid-cols-[1.75rem_1fr] items-center gap-2 text-sm text-muted-foreground">
        <span className="grid size-6 place-items-center rounded-full border border-border font-mono text-[0.625rem] text-foreground">
          3
        </span>
        <span>
          Tap <strong className="font-medium text-foreground">Add</strong> to install webpiano.
        </span>
      </div>
    </div>
  )
}

function BrowserInstructions() {
  return (
    <div className="flex h-full flex-col justify-center gap-3 rounded-lg border border-border bg-muted/40 p-4">
      <MoreHorizontal aria-hidden="true" className="size-5 text-muted-foreground" />
      <div className="flex flex-col gap-1">
        <p className="font-medium">Use your browser’s install option</p>
        <p className="text-sm leading-5 text-muted-foreground">
          Open the browser menu, then choose Install app, Add to Home Screen, or Add to Dock.
        </p>
      </div>
    </div>
  )
}

function InstalledMessage() {
  return (
    <div className="flex h-full items-center gap-3 rounded-lg border border-border bg-muted/40 p-4">
      <span className="grid size-9 place-items-center rounded-full bg-foreground text-background">
        <Check aria-hidden="true" className="size-4" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-medium">webpiano is installed</p>
        <p className="text-sm text-muted-foreground">Open it from your apps or Home Screen.</p>
      </div>
    </div>
  )
}

export function PwaInstallDrawer() {
  const { install, platform, state } = usePwaInstall()
  const [compactLandscape, setCompactLandscape] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const query = window.matchMedia("(max-height: 500px)")

    const update = () => setCompactLandscape(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])

  const installed = state === "installed"
  const triggerLabel = installed ? "webpiano is installed" : "Install webpiano"

  return (
    <Drawer
      open={open}
      showSwipeHandle={!compactLandscape}
      swipeDirection={compactLandscape ? "right" : "down"}
      onOpenChange={setOpen}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-haspopup={state === "installable" ? undefined : "dialog"}
              aria-label={triggerLabel}
              className="w-20 gap-1.5 [@media(max-height:500px)]:size-8 [@media(max-height:500px)]:p-0"
              data-install-state={state}
              size="sm"
              variant={installed ? "secondary" : "outline"}
              onClick={() => {
                if (state === "installable") {
                  void install()
                  return
                }
                setOpen(true)
              }}
            />
          }
        >
          {installed ? (
            <Check aria-hidden="true" data-icon="inline-start" />
          ) : (
            <MonitorDown aria-hidden="true" data-icon="inline-start" />
          )}
          <span className="font-mono text-[0.5625rem] tracking-[0.1em] uppercase [@media(max-height:500px)]:sr-only">
            {installed ? "Installed" : "Install"}
          </span>
        </TooltipTrigger>
        <TooltipContent>{triggerLabel}</TooltipContent>
      </Tooltip>

      <DrawerContent className="[--drawer-height:20rem] [@media(max-height:500px)]:[--drawer-content-width:min(27.5rem,100vw)]">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <DrawerHeader className="relative mx-auto w-full max-w-xl px-5 pt-5 text-left group-data-[swipe-axis=y]/drawer-popup:text-left [@media(max-height:500px)]:px-6">
            <DrawerTitle className="pr-10 font-heading text-2xl">Install webpiano</DrawerTitle>
            <DrawerDescription>Open the piano instantly from your Home Screen.</DrawerDescription>
            <DrawerClose
              render={
                <Button
                  aria-label="Close"
                  className="absolute top-4 right-4"
                  size="icon"
                  variant="outline"
                />
              }
            >
              <X aria-hidden="true" data-icon="inline-start" />
            </DrawerClose>
          </DrawerHeader>

          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-5 pt-4 pb-5 [@media(max-height:500px)]:px-6">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-foreground font-heading text-xl text-background">
                w
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium">webpiano</span>
                <span className="font-mono text-[0.5625rem] tracking-[0.1em] text-muted-foreground uppercase">
                  Keyboard-first piano · PWA
                </span>
              </span>
            </div>

            <div data-install-content={state} className="h-32 shrink-0">
              {state === "checking" ? <InstallChecking /> : null}
              {state === "installed" ? <InstalledMessage /> : null}
              {state === "manual" && platform === "ios" ? <IosInstructions /> : null}
              {state === "manual" && platform === "other" ? <BrowserInstructions /> : null}
              {state === "installable" ? (
                <div className="flex h-full flex-col justify-center gap-3">
                  <Button
                    className="w-full"
                    onClick={() => {
                      void install().then((result) => {
                        if (result?.outcome === "accepted") setOpen(false)
                      })
                    }}
                  >
                    <Download aria-hidden="true" data-icon="inline-start" />
                    Install app
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Your browser will confirm before installing.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <kbd className="grid h-6 min-w-10 place-items-center rounded border border-border bg-background px-1.5 font-mono text-[0.5625rem] text-foreground">
                Space
              </kbd>
              <span>Space toggles Sustain Lock.</span>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
