export type PwaInstallState = "checking" | "installable" | "installed" | "manual"
export type PwaPlatform = "ios" | "other"

interface NavigatorSnapshot {
  maxTouchPoints: number
  platform: string
  userAgent: string
}

interface InstallStateInput {
  detected: boolean
  installed: boolean
  promptAvailable: boolean
}

export function detectPwaPlatform(navigatorSnapshot: NavigatorSnapshot): PwaPlatform {
  const appleMobileDevice = /iPad|iPhone|iPod/u.test(navigatorSnapshot.userAgent)
  const desktopModeIpad =
    navigatorSnapshot.platform === "MacIntel" && navigatorSnapshot.maxTouchPoints > 1

  return appleMobileDevice || desktopModeIpad ? "ios" : "other"
}

export function resolvePwaInstallState(input: InstallStateInput): PwaInstallState {
  if (!input.detected) return "checking"
  if (input.installed) return "installed"
  if (input.promptAvailable) return "installable"
  return "manual"
}
