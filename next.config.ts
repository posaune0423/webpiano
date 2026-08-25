import { spawnSync } from "node:child_process"

import withSerwistInit from "@serwist/next"
import type { NextConfig } from "next"

const gitRevision = spawnSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).stdout.trim()
const revision = process.env.GITHUB_SHA ?? (gitRevision.length > 0 ? gitRevision : "development")

const withSerwist = withSerwistInit({
  additionalPrecacheEntries: [
    {
      url: "/~offline",
      revision,
    },
  ],
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
})

const nextConfig: NextConfig = {
  reactCompiler: true,
}

export default withSerwist(nextConfig)
