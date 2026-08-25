import { createEnv } from "@t3-oss/env-nextjs"
import * as v from "valibot"

interface RuntimeEnvironment {
  NEXT_PUBLIC_APP_URL: string | undefined
}

export function createAppEnv(runtimeEnv: RuntimeEnvironment) {
  return createEnv({
    client: {
      NEXT_PUBLIC_APP_URL: v.pipe(v.string(), v.url()),
    },
    runtimeEnv,
    emptyStringAsUndefined: true,
  })
}
