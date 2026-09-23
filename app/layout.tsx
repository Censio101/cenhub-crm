import type { Metadata } from "next"
import { Geist_Mono } from "next/font/google"

import { AppShell } from "@/components/layout/AppShell"
import { TooltipProvider } from "@/components/ui/tooltip"
import { outfit, poppins } from "@/lib/fonts/app-fonts"

import "./globals.css"

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
      className={`${outfit.variable} ${outfit.className} ${poppins.variable} ${geistMono.variable} min-h-dvh antialiased`}
    >
      <body className="min-h-dvh bg-background font-sans text-foreground">
        <TooltipProvider>
          <AppShell>{children}</AppShell>
        </TooltipProvider>
      </body>
    </html>
  )
}
