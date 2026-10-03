import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Glemt kode – Censio Internal",
}

export default function GlemtKodePage() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,#E4660C_0%,#8B3A08_28%,#2A211C_58%,#121110_100%)]"
      />
      <div className="relative z-10 w-full max-w-md rounded-[22px] border border-white/10 bg-[#1a1614]/85 px-6 py-8 text-center shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <h1 className="text-xl font-semibold text-white">Glemt kode?</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/75">
          Skriv til{" "}
          <a
            href="mailto:kontakt@censio.dk?subject=Censio%20Internal%20%E2%80%93%20ny%20adgangskode"
            className="font-medium text-[#ffb088] underline-offset-4 hover:underline"
          >
            kontakt@censio.dk
          </a>
          , så hjælper head admin dig med en ny kode. Hvis du allerede er logget ind, kan du også skifte kode under{" "}
          <span className="text-white">Indstillinger</span>.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-white/80 underline-offset-4 hover:text-white hover:underline"
        >
          Tilbage til login
        </Link>
      </div>
    </div>
  )
}
