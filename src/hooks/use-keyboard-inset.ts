import { useEffect } from 'react'

/**
 * Keeps CSS custom properties in sync with the visual viewport so `#root`
 * can stay pinned above the software keyboard on mobile.
 *
 * Sets on `<html>`:
 * - `--vv-height`: visual viewport height (px)
 * - `--kb`:        keyboard inset height (px)
 *
 * Prevents iOS Safari's native viewport scroll by locking html/body to
 * position:fixed (via CSS) and resetting any scroll that sneaks through.
 */
export const useKeyboardInset = (): void => {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    let rafId = 0
    let prevHeight = vv.height
    let stableFrames = 0

    // Immediately kill any viewport scroll iOS tries to do
    const lockScroll = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0)
      }
    }

    const apply = () => {
      lockScroll()
      const el = document.documentElement.style
      el.setProperty('--vv-height', `${vv.height}px`)
      el.setProperty('--kb', `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`)
    }

    const poll = () => {
      apply()

      const heightChanged = vv.height !== prevHeight
      prevHeight = vv.height

      if (heightChanged) {
        stableFrames = 0
      } else {
        stableFrames++
      }

      if (stableFrames < 20) {
        rafId = requestAnimationFrame(poll)
      } else {
        rafId = 0
      }
    }

    const startPolling = () => {
      stableFrames = 0
      if (!rafId) {
        rafId = requestAnimationFrame(poll)
      }
    }

    apply()

    // Synchronous scroll listener — fires before next paint
    window.addEventListener('scroll', lockScroll, { passive: false })
    document.addEventListener('focusin', startPolling)
    document.addEventListener('focusout', startPolling)
    vv.addEventListener('resize', startPolling)
    vv.addEventListener('scroll', startPolling)

    return () => {
      window.removeEventListener('scroll', lockScroll)
      document.removeEventListener('focusin', startPolling)
      document.removeEventListener('focusout', startPolling)
      vv.removeEventListener('resize', startPolling)
      vv.removeEventListener('scroll', startPolling)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])
}
