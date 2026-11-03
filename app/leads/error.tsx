"use client"

import { SheetErrorFallback } from "@/components/client/SheetErrorFallback"

export default function LeadsError(props: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return <SheetErrorFallback {...props} />
}
