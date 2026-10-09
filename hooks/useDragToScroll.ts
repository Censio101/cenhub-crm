"use client"

import { type RefObject, useEffect, useRef, useState } from "react"

/** How far the mouse must move before a press becomes a pan (below this it stays a click). */
const PAN_THRESHOLD_PX = 4
/** Clicks right after a pan are swallowed so releasing over a cell never triggers it. */
const CLICK_SUPPRESS_MS = 120
/** Only the last bit of movement decides how hard a flick is. */
const VELOCITY_WINDOW_MS = 100
/** Slower than this (px per ms) and the sheet simply stops where it was released. */
const MIN_FLING_VELOCITY = 0.3
/** Share of speed kept per 16.7 ms frame while coasting. */
const FRICTION_PER_FRAME = 0.93
const STOP_VELOCITY = 0.02

type Sample = { t: number; x: number; y: number }

/**
 * Parts of the sheet that keep their own mouse behaviour: dropdowns (they open on press),
 * popups, and a text field that already has focus (dragging there selects text).
 * Plain buttons and links are fine: a small movement is still a click, a bigger one pans.
 */
function isPanBlockedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const dialog = target.closest('[role="dialog"]')
  if (dialog && !dialog.closest("[data-lead-sheet-focus-shell]")) {
    return true
  }
  if (
    target.closest(
      'select, [role="combobox"], [role="listbox"], [role="menu"], [data-lead-sheet-no-pan="true"]'
    )
  ) {
    return true
  }
  const isTextField =
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
  return isTextField && target === document.activeElement
}

function clearTextSelection() {
  const selection = window.getSelection()
  if (selection && selection.rangeCount > 0) {
    selection.removeAllRanges()
  }
}

/**
 * Click-drag to pan a scroll container with the mouse: smooth (one scroll write per frame),
 * with a little momentum after a flick. Touch and trackpads keep their native scrolling.
 */
export function useDragToScroll(containerRef: RefObject<HTMLElement | null>) {
  const [panning, setPanning] = useState(false)
  const lastPanEndRef = useRef(Number.NEGATIVE_INFINITY)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const container: HTMLElement = el

    const drag = {
      pending: false,
      active: false,
      pointerId: -1,
      startX: 0,
      startY: 0,
      startLeft: 0,
      startTop: 0,
      targetLeft: 0,
      targetTop: 0,
      samples: [] as Sample[],
    }
    let frame = 0
    let flingFrame = 0

    function stopFling() {
      if (flingFrame) {
        cancelAnimationFrame(flingFrame)
        flingFrame = 0
      }
    }

    function applyScroll() {
      frame = 0
      container.scrollLeft = drag.targetLeft
      container.scrollTop = drag.targetTop
    }

    function scheduleScroll() {
      if (!frame) frame = requestAnimationFrame(applyScroll)
    }

    function startFling() {
      const samples = drag.samples
      drag.samples = []
      if (samples.length < 2) return
      const first = samples[0]
      const last = samples[samples.length - 1]
      const elapsed = last.t - first.t
      if (elapsed <= 0 || performance.now() - last.t > VELOCITY_WINDOW_MS) return

      // Content moves with the hand, so scrolling goes the opposite way of the pointer.
      let vx = (first.x - last.x) / elapsed
      let vy = (first.y - last.y) / elapsed
      if (Math.hypot(vx, vy) < MIN_FLING_VELOCITY) return

      let previous = performance.now()
      const step = (now: number) => {
        const dt = Math.min(now - previous, 48)
        previous = now
        const beforeLeft = container.scrollLeft
        const beforeTop = container.scrollTop
        container.scrollLeft += vx * dt
        container.scrollTop += vy * dt
        const decay = Math.pow(FRICTION_PER_FRAME, dt / 16.7)
        vx *= decay
        vy *= decay
        const stuck = container.scrollLeft === beforeLeft && container.scrollTop === beforeTop
        if (stuck || Math.hypot(vx, vy) < STOP_VELOCITY) {
          flingFrame = 0
          return
        }
        flingFrame = requestAnimationFrame(step)
      }
      flingFrame = requestAnimationFrame(step)
    }

    function finish(allowFling: boolean) {
      const wasActive = drag.active
      const pointerId = drag.pointerId
      drag.pending = false
      drag.active = false

      if (frame) {
        cancelAnimationFrame(frame)
        applyScroll()
      }
      if (!wasActive) {
        drag.samples = []
        return
      }

      if (container.hasPointerCapture(pointerId)) {
        container.releasePointerCapture(pointerId)
      }
      lastPanEndRef.current = performance.now()
      setPanning(false)
      clearTextSelection()
      if (allowFling) startFling()
      else drag.samples = []
    }

    const onPointerDown = (event: PointerEvent) => {
      // Touch and pen scroll natively; only a left mouse press can start a pan.
      if (event.pointerType !== "mouse" || event.button !== 0) return
      stopFling()
      if (isPanBlockedTarget(event.target)) return

      drag.pending = true
      drag.active = false
      drag.pointerId = event.pointerId
      drag.startX = event.clientX
      drag.startY = event.clientY
      drag.startLeft = container.scrollLeft
      drag.startTop = container.scrollTop
      drag.targetLeft = drag.startLeft
      drag.targetTop = drag.startTop
      drag.samples = [{ t: event.timeStamp, x: event.clientX, y: event.clientY }]
    }

    const activatePan = (event: PointerEvent) => {
      try {
        container.setPointerCapture(event.pointerId)
      } catch {
        // The pointer is already gone; treat the press as a plain click.
        drag.pending = false
        return
      }
      drag.pending = false
      drag.active = true
      setPanning(true)
      clearTextSelection()
      const focused = document.activeElement
      if (focused instanceof HTMLElement && container.contains(focused)) {
        focused.blur()
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== drag.pointerId) return
      if (!drag.pending && !drag.active) return

      // The button was released somewhere we did not see (outside the window, a context menu).
      if (event.buttons === 0) {
        finish(false)
        return
      }

      const dx = event.clientX - drag.startX
      const dy = event.clientY - drag.startY

      if (drag.pending) {
        if (Math.hypot(dx, dy) < PAN_THRESHOLD_PX) return
        activatePan(event)
        if (!drag.active) return
      }

      drag.targetLeft = drag.startLeft - dx
      drag.targetTop = drag.startTop - dy
      scheduleScroll()

      drag.samples.push({ t: event.timeStamp, x: event.clientX, y: event.clientY })
      const cutoff = event.timeStamp - VELOCITY_WINDOW_MS
      while (drag.samples.length > 2 && drag.samples[0].t < cutoff) drag.samples.shift()

      event.preventDefault()
    }

    const onPointerEnd = (event: PointerEvent) => {
      if (event.pointerId !== drag.pointerId) return
      finish(event.type === "pointerup")
    }

    const onLostCapture = (event: PointerEvent) => {
      if (event.pointerId !== drag.pointerId || !drag.active) return
      finish(false)
    }

    const onClickCapture = (event: MouseEvent) => {
      if (performance.now() - lastPanEndRef.current < CLICK_SUPPRESS_MS) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    const onSelectStart = (event: Event) => {
      if (drag.active) event.preventDefault()
    }

    const onDragStart = (event: Event) => {
      if (drag.active || drag.pending) event.preventDefault()
    }

    const onWheel = (event: WheelEvent) => {
      stopFling()
      if (!event.shiftKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      const maxLeft = Math.max(0, container.scrollWidth - container.clientWidth)
      const delta = event.deltaY
      if (delta > 0 && container.scrollLeft >= maxLeft - 1) return
      if (delta < 0 && container.scrollLeft <= 0) return
      container.scrollLeft = Math.max(0, Math.min(maxLeft, container.scrollLeft + delta))
      event.preventDefault()
    }

    container.addEventListener("pointerdown", onPointerDown, { capture: true })
    container.addEventListener("pointermove", onPointerMove)
    container.addEventListener("lostpointercapture", onLostCapture)
    container.addEventListener("click", onClickCapture, { capture: true })
    container.addEventListener("selectstart", onSelectStart)
    container.addEventListener("dragstart", onDragStart)
    container.addEventListener("wheel", onWheel, { passive: false })
    // Listen on the window so a release outside the sheet can never leave a pan armed.
    window.addEventListener("pointerup", onPointerEnd)
    window.addEventListener("pointercancel", onPointerEnd)

    return () => {
      container.removeEventListener("pointerdown", onPointerDown, { capture: true })
      container.removeEventListener("pointermove", onPointerMove)
      container.removeEventListener("lostpointercapture", onLostCapture)
      container.removeEventListener("click", onClickCapture, { capture: true })
      container.removeEventListener("selectstart", onSelectStart)
      container.removeEventListener("dragstart", onDragStart)
      container.removeEventListener("wheel", onWheel)
      window.removeEventListener("pointerup", onPointerEnd)
      window.removeEventListener("pointercancel", onPointerEnd)
      stopFling()
      if (frame) cancelAnimationFrame(frame)
      setPanning(false)
    }
  }, [containerRef])

  return panning
}
