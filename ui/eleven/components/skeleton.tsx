// Adapted from ElevenLabs UI, MIT, Copyright (c) 2025 Eleven Labs Inc.
// Pinned source and modifications: ../SOURCES.json; full license: src/vendor/elevenlabs-ui-LICENSE.txt.
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
