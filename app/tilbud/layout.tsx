import { DM_Mono, Outfit } from "next/font/google"

import "@/components/offers/offer-editorial.css"

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
})

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
})

export default function TilbudLayout({ children }: LayoutProps<"/tilbud">) {
  return (
    <div className={`${outfit.variable} ${dmMono.variable} offer-ed-root`}>{children}</div>
  )
}
