"use client"

import { useState } from "react"

import { OfferAcceptForm } from "@/components/offers/OfferAcceptForm"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type OfferAcceptDialogProps = {
  slug: string
  open: boolean
  onOpenChange: (open: boolean) => void
  packageTitle: string
  onAccepted?: (signatureName: string) => void
}

export function OfferAcceptDialog({
  slug,
  open,
  onOpenChange,
  packageTitle,
  onAccepted,
}: OfferAcceptDialogProps) {
  const [done, setDone] = useState(false)
  const [signedAs, setSignedAs] = useState<string | null>(null)

  function handleAccepted(name: string) {
    setSignedAs(name)
    setDone(true)
    onAccepted?.(name)
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      onOpenChange(false)
      return
    }
    onOpenChange(true)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="!w-[min(32rem,calc(100vw-2rem))] !max-h-[min(40rem,calc(100vh-2rem))] p-6 sm:p-8">
        {done ? (
          <>
            <DialogHeader>
              <DialogTitle>Tilbuddet er accepteret</DialogTitle>
              <DialogDescription>
                {signedAs
                  ? `Underskrevet af ${signedAs}. Vi vender tilbage med næste skridt.`
                  : "Tak, vi vender tilbage med næste skridt."}
              </DialogDescription>
            </DialogHeader>
            <DialogClose className="btn-primary mt-4 justify-self-start">Luk</DialogClose>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Underskriv samarbejdet</DialogTitle>
              <DialogDescription>
                Du accepterer <strong>{packageTitle}</strong>. Bekræft med dit fulde navn som digital
                underskrift.
              </DialogDescription>
            </DialogHeader>
            <OfferAcceptForm
              slug={slug}
              onAccepted={handleAccepted}
              submitLabel="Underskriv og acceptér"
            />
            <DialogClose className="mt-2 text-sm text-[#6b6b6b] underline-offset-2 hover:underline">
              Annuller
            </DialogClose>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
