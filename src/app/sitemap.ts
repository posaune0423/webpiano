import type { MetadataRoute } from "next"

import { createAppEnv } from "@/env"

export default function sitemap(): MetadataRoute.Sitemap {
  const appEnv = createAppEnv({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  })
  const appUrl = new URL(appEnv.NEXT_PUBLIC_APP_URL)

  return ["/", "/privacy", "/terms"].map((pathname) => ({
    url: pathname === "/" ? appUrl.origin : new URL(pathname, appUrl).toString(),
  }))
}
