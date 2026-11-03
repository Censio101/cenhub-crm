"use client"

import { createContext, useContext } from "react"

/**
 * The sheet's scrolling element. It is state (not a ref) on purpose: children mount before the
 * parent's ref is attached, so the row windowing must re-run once the element exists.
 */
const LeadSheetScrollContext = createContext<HTMLDivElement | null>(null)

export function LeadSheetScrollProvider({
  scrollElement,
  children,
}: {
  scrollElement: HTMLDivElement | null
  children: React.ReactNode
}) {
  return (
    <LeadSheetScrollContext.Provider value={scrollElement}>
      {children}
    </LeadSheetScrollContext.Provider>
  )
}

export function useLeadSheetScrollElement(): HTMLDivElement | null {
  return useContext(LeadSheetScrollContext)
}
