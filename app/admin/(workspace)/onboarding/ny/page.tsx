import { redirect } from "next/navigation"

export default function AdminOnboardingNewRedirectPage() {
  redirect("/admin/onboarding?tab=opret")
}
