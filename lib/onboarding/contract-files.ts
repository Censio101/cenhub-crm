import { mkdir, readFile, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

import {
  CONTRACTS_BUCKET,
  getSupabaseAdmin,
  isSupabaseStoreConfigured,
} from "@/lib/onboarding/supabase/client"

function localContractPath(storedName: string) {
  const safe = path.basename(storedName)
  return path.join(process.cwd(), ".data", "contracts", safe)
}

function storageObjectPath(workspaceId: string, storedName: string) {
  return `${workspaceId}/${path.basename(storedName)}`
}

export async function saveContractFile(
  workspaceId: string,
  storedName: string,
  bytes: Buffer
): Promise<void> {
  if (isSupabaseStoreConfigured()) {
    const supabase = getSupabaseAdmin()
    const { error } = await supabase.storage
      .from(CONTRACTS_BUCKET)
      .upload(storageObjectPath(workspaceId, storedName), bytes, {
        upsert: true,
        contentType: "application/octet-stream",
      })
    if (error) throw new Error(error.message)
    return
  }
  const filePath = localContractPath(storedName)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, bytes)
}

export async function readContractFile(
  workspaceId: string,
  storedName: string
): Promise<Buffer> {
  if (isSupabaseStoreConfigured()) {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase.storage
      .from(CONTRACTS_BUCKET)
      .download(storageObjectPath(workspaceId, storedName))
    if (error || !data) throw new Error(error?.message ?? "Filen findes ikke.")
    return Buffer.from(await data.arrayBuffer())
  }
  return readFile(localContractPath(storedName))
}

export async function removeContractFile(workspaceId: string, storedName: string): Promise<void> {
  if (isSupabaseStoreConfigured()) {
    const supabase = getSupabaseAdmin()
    await supabase.storage.from(CONTRACTS_BUCKET).remove([storageObjectPath(workspaceId, storedName)])
    return
  }
  await unlink(localContractPath(storedName)).catch(() => undefined)
}
