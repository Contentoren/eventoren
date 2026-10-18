import { Skeleton } from "#ui/static/skeleton/Skeleton.jsx"

export function DashShellSkeleton() {
  return (
    <div class="min-h-dvh bg-surface-base" aria-hidden="true">
      <aside class="fixed inset-y-0 left-0 z-40 hidden h-dvh w-[248px] flex-col border-r border-border-subtle bg-surface p-3 lg:flex">
        <div class="flex items-center gap-2.5 px-2 py-1.5">
          <Skeleton class="size-8 rounded-lg" />
          <div class="flex-1 space-y-1.5">
            <Skeleton class="h-3.5 w-3/4" />
            <Skeleton class="h-3 w-1/2" />
          </div>
        </div>
        <Skeleton class="mt-2 h-9 w-full rounded-control" />
        <div class="mt-3 space-y-1.5 px-1">
          <Skeleton class="h-9 w-full rounded-control" />
          <Skeleton class="h-9 w-full rounded-control" />
          <Skeleton class="h-9 w-full rounded-control" />
          <Skeleton class="h-9 w-full rounded-control" />
          <Skeleton class="h-9 w-full rounded-control" />
        </div>
      </aside>
      <div class="lg:pl-[248px]">
        <div class="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border-subtle bg-surface/80 px-4 lg:px-8">
          <Skeleton class="hidden h-5 w-56 sm:block" />
          <Skeleton class="h-5 w-28 sm:hidden" />
          <div class="flex-1" />
          <Skeleton class="size-9 rounded-full" />
        </div>
        <div class="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Skeleton class="h-8 w-64" />
          <Skeleton class="mt-2 h-4 w-96 max-w-full" />
          <div class="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <Skeleton class="h-28 rounded-card border border-border-subtle" />
            <Skeleton class="h-28 rounded-card border border-border-subtle" />
            <Skeleton class="h-28 rounded-card border border-border-subtle" />
            <Skeleton class="h-28 rounded-card border border-border-subtle" />
          </div>
          <Skeleton class="mt-6 h-64 rounded-card border border-border-subtle" />
        </div>
      </div>
    </div>
  )
}
