import { Skeleton } from "#ui/static/skeleton/Skeleton.jsx"
import { UiContainer } from "#src/ui/UiContainer.tsx"

/** Ladeplatzhalter für das öffentliche Veranstalterprofil (Hero-Band, Kartenraster). */
export function DashProfileSkeleton() {
  return (
    <UiContainer width="wide" class="flex flex-col gap-6 py-6 sm:py-8">
      <div class="overflow-hidden rounded-card border border-border-subtle bg-surface">
        <Skeleton class="h-[120px] rounded-none" />
        <div class="flex flex-col gap-3 px-4 pb-5 sm:px-6">
          <Skeleton class=" -mt-12 size-24 rounded-full" />
          <Skeleton class="h-8 w-2/3" />
          <Skeleton class="h-4 w-1/3" />
        </div>
      </div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton class="aspect-video" />
        <Skeleton class="aspect-video" />
        <Skeleton class="aspect-video" />
      </div>
    </UiContainer>
  )
}
