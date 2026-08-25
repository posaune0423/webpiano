import Image from "next/image"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export default function Home() {
  return (
    <main className="relative isolate min-h-svh overflow-hidden bg-background">
      <div className="mx-auto grid min-h-svh max-w-[90rem] grid-rows-[auto_1fr_auto] gap-8 px-5 py-5 sm:px-8 sm:py-7 lg:px-12 lg:py-10">
        <header className="flex items-center gap-4" aria-label="webpiano">
          <span className="font-heading text-2xl leading-none tracking-tight">webpiano</span>
          <Separator className="max-w-20 bg-border/70" />
          <span className="font-mono text-[0.625rem] tracking-[0.18em] text-muted-foreground uppercase">
            Est. 2026
          </span>
        </header>

        <section className="grid items-center gap-10 py-8 lg:grid-cols-[minmax(22rem,0.72fr)_minmax(0,1.28fr)] lg:gap-16 lg:py-12">
          <div className="relative z-10 flex max-w-xl flex-col items-start gap-7 lg:pl-5">
            <Badge
              variant="outline"
              className="rounded-sm border-brass/45 bg-background/40 px-2.5 py-1 font-mono text-[0.625rem] tracking-[0.16em] text-brass uppercase backdrop-blur-sm"
            >
              Coming soon
            </Badge>

            <div className="flex flex-col gap-5">
              <h1 className="font-heading text-[clamp(4.5rem,11vw,10rem)] leading-[0.72] font-medium tracking-[-0.055em] text-foreground">
                webpiano
              </h1>
              <p className="max-w-md text-lg leading-relaxed text-balance text-muted-foreground sm:text-xl">
                Play anywhere with your portable piano.
              </p>
            </div>

            <p className="max-w-sm font-mono text-[0.6875rem] leading-5 tracking-[0.1em] text-muted-foreground/75 uppercase">
              A precise instrument for the keyboard already beneath your hands.
            </p>
          </div>

          <div className="relative min-h-[19rem] overflow-hidden rounded-lg border border-border/70 bg-card shadow-[var(--shadow-piano)] sm:min-h-[28rem] lg:min-h-[38rem]">
            <Image
              src="/brand/piano-keys-hero.webp"
              alt="Glossy grand piano keys"
              fill
              priority
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover object-center"
            />
            <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-lacquer/75 via-transparent to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-lacquer/70 to-transparent" />
          </div>
        </section>

        <footer className="flex items-end justify-between gap-6 border-t border-border/60 pt-4 font-mono text-[0.625rem] leading-4 tracking-[0.12em] text-muted-foreground uppercase">
          <span>Portable · Expressive · Immediate</span>
          <span className="text-right">Designed in Tokyo</span>
        </footer>
      </div>
    </main>
  )
}
