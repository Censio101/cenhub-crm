import { Outfit, Poppins } from "next/font/google"

export const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
})

export const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
})
