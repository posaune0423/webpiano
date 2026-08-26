// oxlint-disable-next-line typescript/ban-ts-comment
// @ts-ignore `cloudflare:workers` is supplied by Wrangler when this Worker is bundled.
import { DurableObject } from "cloudflare:workers"

import { PedalSessionHandler } from "./pedal-session"

/* oxlint-disable typescript/promise-function-async */
export class PedalSession extends DurableObject {
  private readonly handler: PedalSessionHandler

  constructor(state: ConstructorParameters<typeof DurableObject>[0], env: unknown) {
    super(state, env as never)
    this.handler = new PedalSessionHandler(state, env)
  }

  initialize(...args: Parameters<PedalSessionHandler["initialize"]>) {
    return this.handler.initialize(...args)
  }

  authorize(...args: Parameters<PedalSessionHandler["authorize"]>) {
    return this.handler.authorize(...args)
  }

  end(...args: Parameters<PedalSessionHandler["end"]>) {
    return this.handler.end(...args)
  }

  fetch(...args: Parameters<PedalSessionHandler["fetch"]>) {
    return this.handler.fetch(...args)
  }

  webSocketMessage(...args: Parameters<PedalSessionHandler["webSocketMessage"]>) {
    return this.handler.webSocketMessage(...args)
  }

  webSocketClose(...args: Parameters<PedalSessionHandler["webSocketClose"]>) {
    return this.handler.webSocketClose(...args)
  }

  webSocketError(...args: Parameters<PedalSessionHandler["webSocketError"]>) {
    return this.handler.webSocketError(...args)
  }

  alarm() {
    return this.handler.alarm()
  }
}
