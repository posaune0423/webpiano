import type { Metadata, Viewport } from "next"
import { Cormorant_Garamond, Inter, Space_Mono } from "next/font/google"
import { ViewTransition } from "react"
import type { ReactNode } from "react"

import { TooltipProvider } from "@/components/ui/tooltip"
import { createAppEnv } from "@/env"
import { createHomeMetadata } from "@/lib/seo"
import { cn } from "@/lib/utils"
import { PedalApiProvider } from "@/trpc/client"

import "./globals.css"

const headingFont = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "600"],
})

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

const monoFont = Space_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "700"],
})

const appEnv = createAppEnv({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
})

export const metadata: Metadata = createHomeMetadata(appEnv.NEXT_PUBLIC_APP_URL)

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#11100f",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={cn("dark", headingFont.variable, bodyFont.variable, monoFont.variable)}
    >
      <body className="min-h-svh font-sans antialiased">
        <TooltipProvider>
          <PedalApiProvider>
            <ViewTransition name="crossfade">{children}</ViewTransition>
          </PedalApiProvider>
        </TooltipProvider>
      </body>
    </html>
  )
}
