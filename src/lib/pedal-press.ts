interface PedalMessage {
  down: boolean
  seq: number
  type: "pedal"
  v: 1
}

export class PedalPressController {
  private readonly pointers = new Set<number>()
  private sequence = 0

  constructor(private send: (message: PedalMessage) => void) {}

  get down(): boolean {
    return this.pointers.size > 0
  }

  cancelAll(): void {
    if (!this.down) {
      return
    }

    this.pointers.clear()
    this.sendState(false)
  }

  heartbeat(): void {
    if (this.down) {
      this.send({ v: 1, type: "pedal", seq: this.sequence, down: true })
    }
  }

  press(pointerId: number): void {
    if (this.pointers.has(pointerId)) {
      return
    }

    const wasDown = this.down
    this.pointers.add(pointerId)

    if (!wasDown) {
      this.sendState(true)
    }
  }

  release(pointerId: number): void {
    if (!this.pointers.delete(pointerId) || this.down) {
      return
    }

    this.sendState(false)
  }

  setSender(send: (message: PedalMessage) => void): void {
    this.send = send
  }

  private sendState(down: boolean): void {
    this.sequence += 1
    this.send({ v: 1, type: "pedal", seq: this.sequence, down })
  }
}
