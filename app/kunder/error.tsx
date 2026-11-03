"use client"

import { SheetErrorFallback } from "@/components/client/SheetErrorFallback"

export default function KunderError(props: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return <SheetErrorFallback {...props} />
}
