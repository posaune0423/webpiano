export type SustainSource = "keyboard" | "manual-lock" | "remote-pedal"

export class SustainSources {
  private readonly sources = new Set<SustainSource>()

  constructor(private readonly onChange: (active: boolean) => void) {}

  get active(): boolean {
    return this.sources.size > 0
  }

  clear(source: SustainSource): void {
    this.set(source, false)
  }

  clearAll(): void {
    if (this.sources.size === 0) {
      return
    }

    this.sources.clear()
    this.onChange(false)
  }

  has(source: SustainSource): boolean {
    return this.sources.has(source)
  }

  set(source: SustainSource, enabled: boolean): void {
    const wasActive = this.active

    if (enabled) {
      this.sources.add(source)
    } else {
      this.sources.delete(source)
    }

    if (this.active !== wasActive) {
      this.onChange(this.active)
    }
  }
}
