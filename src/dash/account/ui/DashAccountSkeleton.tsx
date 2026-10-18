import { UiContainer } from "../../../ui/UiContainer.tsx"

export function DashAccountSkeleton() {
  return (
    <UiContainer class="flex flex-col gap-6 py-6 sm:py-10" aria-busy="true" aria-label="Konto wird geladen">
      <div class="flex items-center gap-4">
        <div class="size-14 animate-pulse rounded-full bg-surface-muted" />
        <div class="flex flex-1 flex-col gap-2">
          <div class="h-3 w-20 animate-pulse rounded bg-surface-muted" />
          <div class="h-6 w-48 animate-pulse rounded bg-surface-muted" />
          <div class="h-4 w-56 animate-pulse rounded bg-surface-muted" />
        </div>
      </div>
      <div class="h-10 animate-pulse rounded-card border border-border-subtle bg-surface" />
      <div class="flex flex-col gap-4">
        <div class="h-40 animate-pulse rounded-card border border-border-subtle bg-surface" />
        <div class="h-40 animate-pulse rounded-card border border-border-subtle bg-surface" />
      </div>
    </UiContainer>
  )
}
