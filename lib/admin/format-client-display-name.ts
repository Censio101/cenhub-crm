/** Title-case client names for display (e.g. "demo meta client" → "Demo Meta Client"). */
export function formatClientDisplayName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

export function clientInitialsFromName(name: string) {
  const words = formatClientDisplayName(name).split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}
