import { Separator } from "@/components/ui/separator"

export default function OfflinePage() {
  return (
    <main className="grid min-h-svh place-items-center bg-background px-6 py-16 text-foreground">
      <section className="flex w-full max-w-lg flex-col gap-7 rounded-lg border border-border bg-card p-7 shadow-2xl sm:p-10">
        <span className="font-mono text-[0.625rem] tracking-[0.18em] text-brass uppercase">
          webpiano · offline
        </span>
        <Separator />
        <div className="flex flex-col gap-3">
          <h1 className="font-heading text-5xl leading-none font-medium tracking-tight sm:text-6xl">
            You’re offline
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Reconnect to continue with webpiano.
          </p>
        </div>
      </section>
    </main>
  )
}
