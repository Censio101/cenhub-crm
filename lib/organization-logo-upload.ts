import type { SupabaseClient } from "@supabase/supabase-js"

import {
  isAllowedOrganizationLogoMime,
  ORGANIZATION_LOGO_BUCKET,
  ORGANIZATION_LOGO_MAX_BYTES,
  organizationLogoExtFromFile,
  organizationLogoObjectPath,
} from "@/lib/organization-logo"
import { updateOrganizationById } from "@/lib/db/organizations-repository"

export async function uploadOrganizationLogo(
  supabase: SupabaseClient,
  organizationId: string,
  file: File
): Promise<{ path: string; publicUrl: string }> {
  if (!file.type.startsWith("image/") || !isAllowedOrganizationLogoMime(file.type)) {
    throw new Error("Invalid file type")
  }
  if (file.size > ORGANIZATION_LOGO_MAX_BYTES) {
    throw new Error("File too large")
  }

  const ext = organizationLogoExtFromFile(file)
  const path = organizationLogoObjectPath(organizationId, ext)
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from(ORGANIZATION_LOGO_BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadError) throw uploadError

  await updateOrganizationById(supabase, organizationId, { logo_url: path })

  const { data } = supabase.storage.from(ORGANIZATION_LOGO_BUCKET).getPublicUrl(path)
  return { path, publicUrl: data.publicUrl }
}

export async function clearOrganizationLogo(
  supabase: SupabaseClient,
  organizationId: string,
  existingPath: string | null
): Promise<void> {
  if (existingPath && !existingPath.startsWith("http") && !existingPath.startsWith("/")) {
    await supabase.storage.from(ORGANIZATION_LOGO_BUCKET).remove([existingPath])
  }
  await updateOrganizationById(supabase, organizationId, { logo_url: null })
}
