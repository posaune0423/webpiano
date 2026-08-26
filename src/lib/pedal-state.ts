interface PedalStateLike {
  down: boolean
  seq: number
  type: "pedal"
  v: 1
}

export class RemotePedalState {
  private isDown = false
  private lastSeenAt: number | undefined
  private sequence = -1

  constructor(private readonly deadmanMs: number) {}

  get down(): boolean {
    return this.isDown
  }

  accept(message: PedalStateLike, now: number): boolean | undefined {
    if (message.seq < this.sequence) {
      return undefined
    }

    if (message.seq === this.sequence) {
      if (message.down === this.isDown) {
        this.lastSeenAt = now
      }

      return undefined
    }

    this.sequence = message.seq
    this.lastSeenAt = now

    if (message.down === this.isDown) {
      return undefined
    }

    this.isDown = message.down
    return this.isDown
  }

  expire(now: number): boolean | undefined {
    if (!this.isDown || this.lastSeenAt === undefined || now - this.lastSeenAt <= this.deadmanMs) {
      return undefined
    }

    this.isDown = false
    return false
  }

  reset(): boolean | undefined {
    const wasDown = this.isDown
    this.isDown = false
    this.lastSeenAt = undefined
    this.sequence = -1
    return wasDown ? false : undefined
  }
}
