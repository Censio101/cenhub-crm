/** Title-case client names for display (e.g. "acme corp" → "Acme Corp"). */
export function formatClientDisplayName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

/** The first two words of a client name, for tight spaces (e.g. "Suntech Nordic Solar ApS" → "Suntech Nordic"). */
export function shortClientName(name: string, maxWords = 2) {
  return formatClientDisplayName(name).split(/\s+/).filter(Boolean).slice(0, maxWords).join(" ")
}

export function clientInitialsFromName(name: string) {
  const words = formatClientDisplayName(name).split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}
