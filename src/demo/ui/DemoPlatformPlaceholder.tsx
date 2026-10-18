import { mdiCalendarPlusOutline } from "@adaptive-ds/mdi/mdiCalendarPlusOutline.js"
import { Icon } from "#ui/static/icon/Icon.jsx"

export function DemoPlatformPlaceholder(props: { readonly title: string }) {
  return (
    <div class="flex min-h-[50dvh] items-center justify-center px-4 py-10">
      <div class="w-full max-w-md rounded-card border border-border-subtle bg-surface p-8 text-center shadow-sm">
        <Icon path={mdiCalendarPlusOutline} class="mx-auto size-12 text-content-muted" />
        <h1 class="mt-4 text-xl font-semibold tracking-tight text-content sm:text-2xl">{props.title}</h1>
        <p class="mt-2 text-sm text-content-muted">In Arbeit</p>
      </div>
    </div>
  )
}
