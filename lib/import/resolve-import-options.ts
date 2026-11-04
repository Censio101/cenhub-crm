import { getLeadFunnelById } from "@/lib/db/lead-funnels-repository"
import { funnelSheetSourceLabel } from "@/lib/funnels/funnel-sheet-source-label"
import type { ImportOptions } from "@/lib/import/types"
import type { SupabaseClient } from "@supabase/supabase-js"

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Resolves funnel tag + default segment; rejects unknown or cross-org funnels. */
export async function resolveImportOptions(
  supabase: SupabaseClient,
  organizationId: string,
  options: ImportOptions
): Promise<{ ok: true; options: ImportOptions } | { ok: false; error: string }> {
  const raw = options.leadFunnelId?.trim() ?? ""
  if (!raw) {
    return {
      ok: true,
      options: {
        ...options,
        leadFunnelId: null,
        funnelSourceLabel: null,
        funnelDefaultSegment: "",
      },
    }
  }
  if (!UUID.test(raw)) return { ok: false, error: "Invalid funnel" }

  const funnel = await getLeadFunnelById(supabase, raw)
  if (!funnel || funnel.organization_id !== organizationId) {
    return { ok: false, error: "Invalid funnel" }
  }
  if (!funnel.enabled) return { ok: false, error: "Funnel is disabled" }

  return {
    ok: true,
    options: {
      ...options,
      leadFunnelId: funnel.id,
      funnelSourceLabel: funnelSheetSourceLabel(funnel),
      funnelDefaultSegment: funnel.default_segment ?? "",
    },
  }
}
