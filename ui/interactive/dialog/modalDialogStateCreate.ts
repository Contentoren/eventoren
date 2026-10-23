import { cn } from "cn"

export type ModalDialogSize = "sm" | "md" | "lg"

export interface ModalDialogStateProps {
  size: () => ModalDialogSize
  nested: () => boolean
}

const modalDialogSizeClass: Record<ModalDialogSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
}

const modalDialogOverlayBase = [
  "fixed inset-0", // positioning
  "transition-opacity duration-200 motion-reduce:transition-none",
  "data-closed:opacity-0", // animation
]

const modalDialogContentBase = [
  "fixed inset-x-0 bottom-0", // mobile: bottom sheet, full width
  "flex max-h-[92dvh] w-full flex-col",
  "rounded-t-2xl border-t border-border-subtle bg-surface text-content shadow-xl",
  "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2", // desktop: centered card
  "sm:-translate-x-1/2 sm:-translate-y-1/2",
  "sm:rounded-card sm:border",
  "transition-transform duration-200 motion-reduce:transition-none",
  "data-open:animate-in data-open:fade-in-50% data-open:zoom-in-95%",
  "data-closed:animate-out data-closed:fade-out-50% data-closed:zoom-out-95%",
  "data-closed:translate-y-full sm:data-closed:translate-y-0", // mobile: slide down on close
]

/**
 * Class state for ModalDialog: overlay tone/z and centered-card sizing.
 * Nested dialogs (rendered as JSX children of a Sheet's content) sit above the
 * parent layer with a lighter overlay.
 */
export function modalDialogStateCreate(p: ModalDialogStateProps) {
  const overlayClass = () => cn(modalDialogOverlayBase, p.nested() ? "z-[60] bg-black/20" : "z-40 bg-black/40")

  const contentClass = (extra?: string) =>
    cn(modalDialogContentBase, p.nested() ? "z-[70]" : "z-50", modalDialogSizeClass[p.size()], extra)

  return { overlayClass, contentClass }
}
