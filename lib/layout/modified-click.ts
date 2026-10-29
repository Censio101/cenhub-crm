type ClickLike = {
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  button: number
}

/**
 * True for clicks that should keep the browser's own link behaviour (open in a new tab or
 * window): Cmd/Ctrl/Shift/Alt + click or a middle click. Plain left clicks can be intercepted.
 */
export function isModifiedClick(event: ClickLike): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0
}
