import type { Metadata, Viewport } from "next"
import { Cormorant_Garamond, Inter, Space_Mono } from "next/font/google"
import type { ReactNode } from "react"

import { createAppEnv } from "@/env"
import { cn } from "@/lib/utils"

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

const description = "Play a two-octave piano instantly with your computer keyboard or touch."

export const metadata: Metadata = {
  metadataBase: new URL(appEnv.NEXT_PUBLIC_APP_URL),
  applicationName: "webpiano",
  title: "webpiano — Play now",
  description,
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "webpiano",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: "webpiano",
    title: "webpiano — Play now",
    description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "webpiano — Play now",
    description,
  },
}

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
      <body className="min-h-svh font-sans antialiased">{children}</body>
    </html>
  )
}
