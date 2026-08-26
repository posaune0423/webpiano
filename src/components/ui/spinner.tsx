import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <output data-slot="spinner" aria-label="Loading" className="inline-flex">
      <Loader2Icon aria-hidden="true" className={cn("size-4 animate-spin", className)} {...props} />
    </output>
  )
}

export { Spinner }
