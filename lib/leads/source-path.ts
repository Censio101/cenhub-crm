/**
 * Source paths point at a value inside a sender's JSON: `contact.name`, `answers.0.value`,
 * `Your Name`. Safe for browser and server (no Node imports).
 */

/** Keys that must never be read through a path (they reach into object internals). */
const UNSAFE_PATH_KEYS = new Set(["__proto__", "constructor", "prototype"])

/**
 * Splits a source path on dots. A key that itself contains a dot is written with a backslash
 * (`contact\.email`); `\\` is a literal backslash. Spaces inside a segment are fine.
 */
export function splitSourcePath(path: string): string[] {
  const parts: string[] = []
  let current = ""
  for (let i = 0; i < path.length; i += 1) {
    const ch = path[i]
    if (ch === "\\" && (path[i + 1] === "." || path[i + 1] === "\\")) {
      current += path[i + 1]
      i += 1
    } else if (ch === ".") {
      parts.push(current)
      current = ""
    } else {
      current += ch
    }
  }
  parts.push(current)
  return parts
}

/** Writes one key as a path segment (the reverse of `splitSourcePath`). */
export function escapePathSegment(segment: string): string {
  return segment.replace(/\\/g, "\\\\").replace(/\./g, "\\.")
}

export function getByPath(obj: unknown, path: string): unknown {
  if (!path) return undefined
  let current: unknown = obj
  for (const part of splitSourcePath(path)) {
    if (current == null || typeof current !== "object") return undefined
    if (UNSAFE_PATH_KEYS.has(part)) return undefined
    if (!Object.prototype.hasOwnProperty.call(current, part)) return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}
