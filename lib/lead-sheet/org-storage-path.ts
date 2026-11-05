/** Storage object key for a lead file that belongs to this organization. */
export function isOrgStoragePath(path: string, organizationId: string): boolean {
  if (!path || !organizationId) return false
  if (path.includes("..") || path.includes("\\") || path.includes("\0")) return false
  if (path.startsWith("/") || path.startsWith("http://") || path.startsWith("https://")) return false
  const prefix = `${organizationId}/`
  return path.startsWith(prefix) && path.length > prefix.length
}
