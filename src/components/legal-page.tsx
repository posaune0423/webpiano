import Link from "next/link"
import type { ReactNode } from "react"

import { SiteFooter } from "@/components/site-footer"
import { Separator } from "@/components/ui/separator"

interface LegalPageProps {
  children: ReactNode
  title: string
}

export function LegalPage({ children, title }: LegalPageProps) {
  return (
    <main className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
        <Link
          className="font-heading text-3xl leading-none font-medium tracking-tight hover:text-muted-foreground"
          href="/"
        >
          webpiano
        </Link>
        <Link
          className="font-mono text-[0.625rem] tracking-[0.12em] text-muted-foreground uppercase underline-offset-4 hover:text-foreground hover:underline"
          href="/"
        >
          Back to webpiano
        </Link>
      </header>

      <Separator />

      <article className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-5 py-12 sm:px-8 sm:py-16">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-5xl leading-none font-medium tracking-tight sm:text-6xl">
            {title}
          </h1>
          <p className="font-mono text-[0.625rem] tracking-[0.12em] text-muted-foreground uppercase">
            Last updated: August 26, 2026
          </p>
        </div>
        <div className="flex flex-col gap-8 text-sm leading-7 text-muted-foreground sm:text-base">
          {children}
        </div>
      </article>

      <Separator />
      <SiteFooter />
    </main>
  )
}

export function LegalSection({ children, title }: LegalPageProps) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-heading text-2xl font-medium text-foreground sm:text-3xl">{title}</h2>
      {children}
    </section>
  )
}
