import { cn } from "cn"

/**
 * Base skeleton placeholder — a warm, low-contrast block with a soft
 * shimmer sweep (see `skeleton-shimmer` in globals.css). Compose small
 * pieces of this (a line, a circle, a chip) to mirror the real content's
 * shape instead of one big solid block, which reads as a heavy "box".
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("skeleton-shimmer", className)}
      {...props}
    />
  )
}

export { Skeleton }
