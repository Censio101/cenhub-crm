/** True when a full lead list from the server can replace what is on screen. */
export function canReplaceLeadsFromServer(
  inflightSaves: number,
  pendingEditCount: number
): boolean {
  return inflightSaves === 0 && pendingEditCount === 0
}

/** True when a remote change arrived while the user still has unsaved edits. */
export function shouldQueueRemoteLeadsReload(
  inflightSaves: number,
  pendingEditCount: number
): boolean {
  return !canReplaceLeadsFromServer(inflightSaves, pendingEditCount)
}
