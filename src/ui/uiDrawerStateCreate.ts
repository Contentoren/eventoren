import { createEffect, createSignal, createUniqueId, onCleanup } from "solid-js"

export function uiDrawerStateCreate(inputs: { open: () => boolean; onClose: () => void }) {
  const titleId = `drawer-title-${createUniqueId()}`
  const descriptionId = `drawer-description-${createUniqueId()}`

  const [isMounted, setIsMounted] = createSignal(inputs.open())
  const [isVisible, setIsVisible] = createSignal(inputs.open())

  let panelNode: HTMLElement | undefined
  let closeButtonNode: HTMLElement | undefined
  let previousActiveElement: HTMLElement | null = null
  let closeTimeoutId: ReturnType<typeof setTimeout> | undefined
  let rafId: number | undefined

  const attachPanelRef = (node: HTMLElement) => {
    panelNode = node
  }

  const attachCloseButtonRef = (node: HTMLElement) => {
    closeButtonNode = node
  }

  const clearPendingTimers = () => {
    if (closeTimeoutId !== undefined) {
      clearTimeout(closeTimeoutId)
      closeTimeoutId = undefined
    }
    if (rafId !== undefined) {
      cancelAnimationFrame(rafId)
      rafId = undefined
    }
  }

  createEffect(() => {
    const shouldOpen = inputs.open()
    clearPendingTimers()

    if (shouldOpen) {
      if (typeof document !== "undefined") {
        previousActiveElement = document.activeElement as HTMLElement | null
      }
      setIsMounted(true)
      rafId = requestAnimationFrame(() => {
        rafId = requestAnimationFrame(() => {
          setIsVisible(true)
          closeButtonNode?.focus()
        })
      })
      return
    }

    if (isVisible()) {
      setIsVisible(false)
      closeTimeoutId = setTimeout(() => {
        setIsMounted(false)
        if (previousActiveElement && typeof previousActiveElement.focus === "function") {
          previousActiveElement.focus()
        }
      }, 300)
      return
    }

    if (!closeTimeoutId) {
      setIsMounted(false)
    }
  })

  const requestClose = () => {
    if (!inputs.open() && !isVisible()) return
    setIsVisible(false)
    clearPendingTimers()
    closeTimeoutId = setTimeout(() => {
      setIsMounted(false)
      if (previousActiveElement && typeof previousActiveElement.focus === "function") {
        previousActiveElement.focus()
      }
    }, 300)
    inputs.onClose()
  }

  const handleBackdropClick = (event: MouseEvent) => {
    if (event.target !== event.currentTarget) return
    requestClose()
  }

  createEffect(() => {
    if (typeof document === "undefined") return
    if (!isMounted()) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    onCleanup(() => {
      document.body.style.overflow = previousOverflow
    })
  })

  createEffect(() => {
    if (typeof window === "undefined") return
    if (!isMounted()) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        requestClose()
        return
      }

      if (event.key !== "Tab") return

      const panel = panelNode
      if (!panel) return

      const focusableSelector =
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector))
      if (focusables.length === 0) return

      const firstElement = focusables[0]
      const lastElement = focusables[focusables.length - 1]

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement?.focus()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    onCleanup(() => {
      window.removeEventListener("keydown", handleKeyDown)
    })
  })

  createEffect(() => {
    if (typeof window === "undefined") return
    if (!isMounted()) return

    const mediaQuery = window.matchMedia("(min-width: 768px)")
    const handleMediaChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        requestClose()
      }
    }

    mediaQuery.addEventListener("change", handleMediaChange)
    onCleanup(() => {
      mediaQuery.removeEventListener("change", handleMediaChange)
    })
  })

  onCleanup(() => {
    clearPendingTimers()
  })

  return {
    titleId,
    descriptionId,
    isMounted,
    isVisible,
    attachPanelRef,
    attachCloseButtonRef,
    requestClose,
    handleBackdropClick,
  }
}
