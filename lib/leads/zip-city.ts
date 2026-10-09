/** Looks up the Danish city for a 4-digit postcode (DAWA, free and CORS-enabled). Never throws. */
export async function lookupDanishCity(zip: string, signal?: AbortSignal): Promise<string | null> {
  if (!/^\d{4}$/.test(zip)) return null
  try {
    const response = await fetch(`https://api.dataforsyningen.dk/postnumre/${zip}`, { signal })
    if (!response.ok) return null
    const data = (await response.json()) as { navn?: unknown }
    return typeof data.navn === "string" && data.navn.trim() ? data.navn.trim() : null
  } catch {
    return null
  }
}
