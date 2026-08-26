import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 font-mono text-[0.625rem] tracking-[0.12em] text-muted-foreground uppercase sm:px-8 lg:px-10">
      <span>© 2026 webpiano</span>
      <nav aria-label="Legal" className="flex items-center gap-4">
        <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/terms">
          Terms
        </Link>
        <Link className="underline-offset-4 hover:text-foreground hover:underline" href="/privacy">
          Privacy Policy
        </Link>
      </nav>
    </footer>
  )
}
