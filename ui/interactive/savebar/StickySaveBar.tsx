import { cn } from "cn"
import { Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { stickySaveBarStateCreate } from "#ui/interactive/savebar/stickySaveBarStateCreate.js"

export interface StickySaveBarProps {
  visible: boolean
  onSave: () => void
  onDiscard: () => void
  saving?: boolean
  message?: string
  saveLabel?: string
  discardLabel?: string
  error?: string | null
}

/**
 * Fixed bottom-center floating pill for unsaved form changes.
 * Ctrl/⌘+S triggers onSave while visible. aria-live polite.
 */
export function StickySaveBar(p: StickySaveBarProps) {
  stickySaveBarStateCreate({
    visible: () => p.visible,
    saving: () => p.saving ?? false,
    onSave: () => p.onSave(),
  })

  return (
    <div
      aria-live="polite"
      class={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
        "transition-all duration-200 motion-reduce:transition-none",
        p.visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
      )}
    >
      <Show when={p.visible}>
        <div class="pointer-events-auto flex w-full max-w-xl flex-col gap-1.5 rounded-2xl bg-surface-inverted px-4 py-3 text-content-inverted shadow-lg">
          <div class="flex flex-wrap items-center gap-3">
            <p class="min-w-0 flex-1 text-sm font-medium">{p.message ?? "Ungespeicherte Änderungen"}</p>
            <div class="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => p.onDiscard()}
                disabled={p.saving}
                class="text-content-inverted hover:bg-white/10 dark:hover:bg-black/10"
              >
                {p.discardLabel ?? "Verwerfen"}
              </Button>
              <Button variant="filled" size="sm" onClick={() => p.onSave()} disabled={p.saving}>
                {p.saving ? "Wird gespeichert …" : (p.saveLabel ?? "Speichern")}
              </Button>
            </div>
          </div>
          <Show when={p.error}>
            <p class="text-sm text-red-300 dark:text-red-300">{p.error}</p>
          </Show>
        </div>
      </Show>
    </div>
  )
}
