import type { Metadata } from "next"
import Link from "next/link"

import { CURRENT_COMPANY } from "@/lib/company"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Onboarding – Censio",
}

const STEPS = [
  {
    href: "/",
    title: "Se jeres dashboard",
    text: "Følg leads, kunder og bundlinje for den valgte periode.",
  },
  {
    href: "/leads",
    title: "Gennemgå nye leads",
    text: "Flyt forespørgsler videre, så I ikke mister opgaver.",
  },
  {
    href: "/indstillinger",
    title: "Tjek virksomhedsoplysninger",
    text: "Bekræft navn og notifikationer, så I får de rigtige beskeder.",
  },
  {
    href: "/kontakt",
    title: "Skriv til Censio",
    text: "Brug Discord-kanalen, hvis I mangler hjælp undervejs.",
  },
]

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
        Kom i gang
      </p>
      <h1 className="mt-1 text-2xl font-medium tracking-tight text-foreground sm:text-[1.75rem]">
        Velkommen til Censio
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        En kort tjekliste til {CURRENT_COMPANY.name}, så CRM’et er klar til
        hverdagen.
      </p>

      <Card className="dashboard-card mt-8">
        <CardHeader>
          <CardTitle>Onboarding</CardTitle>
          <CardDescription>
            Fire trin, der dækker det vigtigste for en håndværksvirksomhed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3">
            {STEPS.map((step, index) => (
              <li key={step.href}>
                <Link
                  href={step.href}
                  className="flex gap-4 rounded-[15px] bg-muted/70 px-4 py-3 transition-colors hover:bg-accent"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">
                      {step.title}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {step.text}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
