"use client"

import { type RefObject, useEffect, useRef, useState } from "react"

const PAN_THRESHOLD_PX = 5

/** Controls that should keep normal click behavior (never start pan). */
function isPanBlockedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest(
      'button, a, select, [role="combobox"], [role="listbox"], [role="dialog"], [data-lead-sheet-no-pan="true"]'
    )
  )
}

function clearTextSelection() {
  const selection = window.getSelection()
  if (selection && selection.rangeCount > 0) {
    selection.removeAllRanges()
  }
}

/** Click-drag to pan a scroll container. Dragging over fields pans once movement passes the threshold. */
export function useDragToScroll(containerRef: RefObject<HTMLElement | null>) {
  const [panning, setPanning] = useState(false)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const drag = {
      pending: false,
      active: false,
      pointerId: -1,
      startX: 0,
      startY: 0,
      scrollLeft: 0,
      scrollTop: 0,
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 && event.button !== 1) return
      if (isPanBlockedTarget(event.target)) return
      drag.pending = true
      drag.active = false
      drag.pointerId = event.pointerId
      drag.startX = event.clientX
      drag.startY = event.clientY
      drag.scrollLeft = el.scrollLeft
      drag.scrollTop = el.scrollTop
    }

    const activatePan = (event: PointerEvent) => {
      drag.pending = false
      drag.active = true
      el.setPointerCapture(event.pointerId)
      setPanning(true)
      clearTextSelection()
      const active = document.activeElement
      if (active instanceof HTMLElement && el.contains(active)) {
        active.blur()
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== drag.pointerId) return
      if (!drag.pending && !drag.active) return

      const dx = event.clientX - drag.startX
      const dy = event.clientY - drag.startY

      if (drag.pending && !drag.active) {
        if (Math.hypot(dx, dy) < PAN_THRESHOLD_PX) return
        activatePan(event)
      }

      if (!drag.active) return
      el.scrollLeft = drag.scrollLeft - dx
      el.scrollTop = drag.scrollTop - dy
      event.preventDefault()
    }

    const endPan = (event: PointerEvent) => {
      if (event.pointerId !== drag.pointerId) return
      const wasPan = drag.active
      drag.pending = false
      if (drag.active) {
        drag.active = false
        if (el.hasPointerCapture(event.pointerId)) {
          el.releasePointerCapture(event.pointerId)
        }
        setPanning(false)
        suppressClickRef.current = true
        clearTextSelection()
        event.preventDefault()
      }
      if (wasPan) {
        window.setTimeout(() => {
          suppressClickRef.current = false
        }, 0)
      }
    }

    const onClickCapture = (event: MouseEvent) => {
      if (suppressClickRef.current) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    const onSelectStart = (event: Event) => {
      if (drag.active) event.preventDefault()
    }

    const onDragStart = (event: Event) => {
      if (drag.active) event.preventDefault()
    }

    const onWheel = (event: WheelEvent) => {
      if (!event.shiftKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth)
      const delta = event.deltaY
      if (delta > 0 && el.scrollLeft >= maxLeft - 1) return
      if (delta < 0 && el.scrollLeft <= 0) return
      el.scrollLeft = Math.max(0, Math.min(maxLeft, el.scrollLeft + delta))
      event.preventDefault()
    }

    el.addEventListener("pointerdown", onPointerDown, { capture: true })
    el.addEventListener("pointermove", onPointerMove)
    el.addEventListener("pointerup", endPan)
    el.addEventListener("pointercancel", endPan)
    el.addEventListener("click", onClickCapture, { capture: true })
    el.addEventListener("selectstart", onSelectStart)
    el.addEventListener("dragstart", onDragStart)
    el.addEventListener("wheel", onWheel, { passive: false })

    return () => {
      el.removeEventListener("pointerdown", onPointerDown, { capture: true })
      el.removeEventListener("pointermove", onPointerMove)
      el.removeEventListener("pointerup", endPan)
      el.removeEventListener("pointercancel", endPan)
      el.removeEventListener("click", onClickCapture, { capture: true })
      el.removeEventListener("selectstart", onSelectStart)
      el.removeEventListener("dragstart", onDragStart)
      el.removeEventListener("wheel", onWheel)
      setPanning(false)
    }
  }, [containerRef])

  return panning
}
