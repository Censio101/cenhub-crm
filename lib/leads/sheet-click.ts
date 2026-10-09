/** True when the click landed on a control that should keep its own behaviour. */
export function isSheetControlTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        'button, a, input, select, textarea, label, [role="combobox"], [role="listbox"], [role="menu"], [data-lead-sheet-no-pan="true"]'
      )
    )
  )
}
