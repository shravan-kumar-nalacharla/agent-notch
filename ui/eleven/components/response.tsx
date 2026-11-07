// Adapted from ElevenLabs UI, MIT, Copyright (c) 2025 Eleven Labs Inc.
// Pinned source and modifications: ../SOURCES.json; full license: src/vendor/elevenlabs-ui-LICENSE.txt.
"use client"

import { memo, type ComponentProps } from "react"
import { Streamdown } from "../response-renderer"

import { cn } from "@/lib/utils"

type ResponseProps = ComponentProps<typeof Streamdown>

export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Streamdown
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
)

Response.displayName = "Response"
