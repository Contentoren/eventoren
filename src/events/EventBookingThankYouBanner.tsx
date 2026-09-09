import { UiContainer } from "../ui/UiContainer.tsx"
import { eventBookingThankYouBannerStateCreate } from "./eventBookingThankYouBannerStateCreate.ts"

export function EventBookingThankYouBanner(props: { onDismiss: () => void }) {
  const state = eventBookingThankYouBannerStateCreate({
    onDismiss: () => props.onDismiss(),
  })

  return (
    <aside
      aria-label="Buchungsbestätigung"
      role="status"
      aria-live="polite"
      class="border-b border-success/30 bg-success-soft text-content"
    >
      <UiContainer class="flex items-center justify-between gap-space-4 py-space-4">
        <div class="flex items-center gap-space-3">
          <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-success text-white shadow-xs">
            <svg viewBox="0 0 20 20" fill="currentColor" class="size-5" aria-hidden="true">
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          </span>
          <p class="text-sm font-medium text-content sm:text-base">{state.message()}</p>
        </div>
        <button
          type="button"
          onClick={state.dismiss}
          aria-label="Buchungsbestätigung schließen"
          class="focus-ring -mr-space-1 flex size-9 shrink-0 items-center justify-center rounded-control text-content-muted transition-colors hover:bg-black/5 hover:text-content"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" class="size-5" fill="none" stroke="currentColor">
            <path d="M5 5l10 10M15 5L5 15" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>
      </UiContainer>
    </aside>
  )
}
