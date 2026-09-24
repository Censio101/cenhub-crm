import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  OnboardingApplicationRow,
  OnboardingApplicationSource,
  OnboardingApplicationStatus,
} from "@/lib/db/types"
import type { OnboardingApplicationInput } from "@/lib/onboarding/application-input"
import { onboardingSubmittedAtNow } from "@/lib/onboarding/submitted-at"

export type CreateOnboardingApplicationInput = OnboardingApplicationInput & {
  source: OnboardingApplicationSource
  submitterIpHash?: string | null
}

export async function createOnboardingApplication(
  supabase: SupabaseClient,
  input: CreateOnboardingApplicationInput
): Promise<OnboardingApplicationRow> {
  const { data, error } = await supabase
    .from("onboarding_applications")
    .insert({
      source: input.source,
      submitted_at: onboardingSubmittedAtNow(),
      company_name: input.companyName,
      cvr: input.cvr ?? null,
      contact_full_name: input.contactFullName,
      contact_email: input.contactEmail.trim().toLowerCase(),
      contact_phone: input.contactPhone,
      address: input.address,
      zip_code: input.zipCode,
      city: input.city,
      country: input.country ?? "DK",
      website_url: input.websiteUrl ?? null,
      consent_given: Boolean(input.consentGiven),
      notes: input.notes ?? null,
      submitter_ip_hash: input.submitterIpHash ?? null,
    })
    .select("*")
    .single()

  if (error) throw error
  return data as OnboardingApplicationRow
}

export type OnboardingApplicationStatusCounts = Record<
  OnboardingApplicationStatus | "all",
  number
>

export async function countOnboardingApplicationsByStatus(
  supabase: SupabaseClient
): Promise<OnboardingApplicationStatusCounts> {
  const statuses: OnboardingApplicationStatus[] = ["pending", "approved", "rejected"]
  const counts: OnboardingApplicationStatusCounts = {
    pending: 0,
    approved: 0,
    rejected: 0,
    all: 0,
  }

  await Promise.all(
    statuses.map(async (status) => {
      const { count, error } = await supabase
        .from("onboarding_applications")
        .select("*", { count: "exact", head: true })
        .eq("status", status)
      if (error) throw error
      counts[status] = count ?? 0
    })
  )

  counts.all = counts.pending + counts.approved + counts.rejected
  return counts
}

export async function listOnboardingApplications(
  supabase: SupabaseClient,
  status?: OnboardingApplicationStatus
): Promise<OnboardingApplicationRow[]> {
  let query = supabase
    .from("onboarding_applications")
    .select("*")
    .order("created_at", { ascending: false })

  if (status) query = query.eq("status", status)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as OnboardingApplicationRow[]
}

export async function getOnboardingApplicationById(
  supabase: SupabaseClient,
  id: string
): Promise<OnboardingApplicationRow | null> {
  const { data, error } = await supabase
    .from("onboarding_applications")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  return (data as OnboardingApplicationRow | null) ?? null
}

export async function hasPendingApplicationForEmail(
  supabase: SupabaseClient,
  email: string
): Promise<boolean> {
  const normalized = email.trim().toLowerCase()
  const { data, error } = await supabase
    .from("onboarding_applications")
    .select("id")
    .eq("status", "pending")
    .ilike("contact_email", normalized)
    .limit(1)

  if (error) throw error
  return (data?.length ?? 0) > 0
}

export async function markOnboardingApplicationApproved(
  supabase: SupabaseClient,
  id: string,
  organizationId: string,
  approvedBy: string
): Promise<OnboardingApplicationRow> {
  const { data, error } = await supabase
    .from("onboarding_applications")
    .update({
      status: "approved",
      organization_id: organizationId,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq("id", id)
    .in("status", ["pending", "rejected"])
    .select("*")
    .single()

  if (error) throw error
  return data as OnboardingApplicationRow
}

export async function markOnboardingApplicationReopened(
  supabase: SupabaseClient,
  id: string
): Promise<OnboardingApplicationRow> {
  const { data, error } = await supabase
    .from("onboarding_applications")
    .update({
      status: "pending",
      rejection_reason: null,
    })
    .eq("id", id)
    .eq("status", "rejected")
    .select("*")
    .single()

  if (error) throw error
  return data as OnboardingApplicationRow
}

export async function markOnboardingApplicationRejected(
  supabase: SupabaseClient,
  id: string,
  reason: string
): Promise<OnboardingApplicationRow> {
  const { data, error } = await supabase
    .from("onboarding_applications")
    .update({
      status: "rejected",
      rejection_reason: reason.trim() || null,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("*")
    .single()

  if (error) throw error
  return data as OnboardingApplicationRow
}
