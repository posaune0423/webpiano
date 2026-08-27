"use client"

import { useState, useSyncExternalStore } from "react"

import { detectPwaPlatform, resolvePwaInstallState } from "@/lib/pwa-install"
import type { PwaInstallState, PwaPlatform } from "@/lib/pwa-install"

interface InstallPromptResult {
  outcome: "accepted" | "dismissed"
  platform: string
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<InstallPromptResult>
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean
}

export interface PwaInstallController {
  install: () => Promise<InstallPromptResult | undefined>
  platform: PwaPlatform
  state: PwaInstallState
}

interface PwaInstallSnapshot {
  platform: PwaPlatform
  state: PwaInstallState
}

const SERVER_SNAPSHOT: PwaInstallSnapshot = { platform: "other", state: "checking" }

function createPwaInstallControllerStore() {
  let cleanup: (() => void) | undefined
  let detected = false
  let installed = false
  let installPrompt: BeforeInstallPromptEvent | null = null
  let platform: PwaPlatform = "other"
  let promptAvailable = false
  let snapshot = SERVER_SNAPSHOT
  const listeners = new Set<() => void>()

  function emit() {
    snapshot = {
      platform,
      state: resolvePwaInstallState({ detected, installed, promptAvailable }),
    }
    for (const listener of listeners) listener()
  }

  function start() {
    const displayMode = window.matchMedia("(display-mode: standalone)")
    const navigatorWithStandalone = navigator as NavigatorWithStandalone
    platform = detectPwaPlatform({
      maxTouchPoints: navigator.maxTouchPoints,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
    })
    installed = Boolean(displayMode.matches || navigatorWithStandalone.standalone)
    detected = true

    function handleInstallPrompt(event: Event) {
      event.preventDefault()
      installPrompt = event as BeforeInstallPromptEvent
      promptAvailable = true
      emit()
    }

    function handleInstalled() {
      installPrompt = null
      promptAvailable = false
      installed = true
      emit()
    }

    function handleDisplayModeChange(event: MediaQueryListEvent) {
      if (event.matches) handleInstalled()
    }

    window.addEventListener("beforeinstallprompt", handleInstallPrompt)
    window.addEventListener("appinstalled", handleInstalled)
    displayMode.addEventListener("change", handleDisplayModeChange)
    cleanup = () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt)
      window.removeEventListener("appinstalled", handleInstalled)
      displayMode.removeEventListener("change", handleDisplayModeChange)
      cleanup = undefined
    }
    emit()
  }

  return {
    getServerSnapshot: () => SERVER_SNAPSHOT,
    getSnapshot: () => snapshot,
    install: async () => {
      if (!installPrompt) return undefined

      const result = await installPrompt.prompt()
      installPrompt = null
      promptAvailable = false
      emit()
      return result
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      if (!cleanup) start()
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) cleanup?.()
      }
    },
  }
}

export function usePwaInstall(): PwaInstallController {
  const [store] = useState(createPwaInstallControllerStore)
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)

  return { install: store.install, ...snapshot }
}
