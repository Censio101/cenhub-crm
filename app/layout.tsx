import type { Metadata } from "next"
import { Geist_Mono, Outfit } from "next/font/google"

import { AppShell } from "@/components/layout/AppShell"
import { TooltipProvider } from "@/components/ui/tooltip"

import "./globals.css"

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Censio – Performance",
  description: "Følg udviklingen i leads, kunder og omsætning",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="da"
      className={`${outfit.variable} ${outfit.className} ${geistMono.variable} h-full max-w-full overflow-x-clip antialiased`}
    >
      <body className="min-h-full max-w-full overflow-x-clip bg-background font-sans text-foreground">
        <TooltipProvider>
          <AppShell>{children}</AppShell>
        </TooltipProvider>
      </body>
    </html>
  )
}
