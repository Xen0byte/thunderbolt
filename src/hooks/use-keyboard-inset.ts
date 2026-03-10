import { useEffect } from 'react'

/**
 * Keeps CSS custom properties in sync with the visual viewport so `#root`
 * can stay pinned above the software keyboard on mobile.
 *
 * Sets on `<html>`:
 * - `--vv-top`:    visual viewport scroll offset (px) — on iOS Safari the
 *                  browser scrolls the layout viewport when the keyboard opens,
 *                  so fixed elements drift off-screen unless compensated.
 * - `--vv-height`: visual viewport height (px) — shrinks to the area above
 *                  the keyboard.
 * - `--kb`:        keyboard inset height (px) — kept for consumers that need
 *                  the raw keyboard height (e.g. positioned dialogs).
 *
 * Uses `requestAnimationFrame` polling while the viewport is animating
 * (keyboard slide) so the values update every frame instead of only when
 * the browser fires `resize`/`scroll` events.
 */
export const useKeyboardInset = (): void => {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    let rafId = 0
    let prevTop = vv.offsetTop
    let prevHeight = vv.height
    let stableFrames = 0

    const apply = () => {
      const el = document.documentElement.style
      el.setProperty('--vv-top', `${vv.offsetTop}px`)
      el.setProperty('--vv-height', `${vv.height}px`)
      el.setProperty('--kb', `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`)
    }

    /** Poll every frame until the viewport stops moving. */
    const poll = () => {
      apply()

      const topChanged = vv.offsetTop !== prevTop
      const heightChanged = vv.height !== prevHeight
      prevTop = vv.offsetTop
      prevHeight = vv.height

      if (topChanged || heightChanged) {
        stableFrames = 0
      } else {
        stableFrames++
      }

      // Keep polling until 10 consecutive stable frames (~160ms)
      if (stableFrames < 10) {
        rafId = requestAnimationFrame(poll)
      } else {
        rafId = 0
      }
    }

    const onViewportChange = () => {
      stableFrames = 0
      if (!rafId) {
        rafId = requestAnimationFrame(poll)
      }
    }

    apply()

    vv.addEventListener('resize', onViewportChange)
    vv.addEventListener('scroll', onViewportChange)

    return () => {
      vv.removeEventListener('resize', onViewportChange)
      vv.removeEventListener('scroll', onViewportChange)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])
}
