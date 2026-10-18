import { mdiAccountCircleOutline } from "@adaptive-ds/mdi/mdiAccountCircleOutline.js"
import { mdiLogout } from "@adaptive-ds/mdi/mdiLogout.js"
import Popover from "@corvu/popover"
import { dashSessionUser } from "#src/dash/store/dashSessionUser.ts"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { classesPopoverContentMerge } from "#ui/interactive/popover/classesPopoverContent.js"
import { themeRotate, themeSignal } from "#ui/interactive/theme/themeSignal.js"
import { themeIcon, themeVariant } from "#ui/interactive/theme/themeVariant.js"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { Avatar } from "#ui/static/avatar/Avatar.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

const dashUserMenuRowClass = "h-9 w-full justify-start gap-2 px-2.5 text-sm font-normal"

function dashExternOpen(href: string) {
  if (typeof window === "undefined") return
  window.open(href, "_blank", "noopener,noreferrer")
}

function dashThemeLabel(): string {
  const current = themeSignal.get()
  if (current === themeVariant.light) return "Hell"
  if (current === themeVariant.dark) return "Dunkel"
  return "System"
}

/** Sidebar-Nutzerzeile als Popover: Kundenkonto, Hell/Dunkel, Abmelden (Demo-Toast). */
export function DashUserMenu() {
  const open = createSignalObject(false)
  const user = () => dashSessionUser()
  return (
    <Popover open={open.get()} onOpenChange={(next) => open.set(next)}>
      <Popover.Trigger
        type="button"
        class="mt-1 flex h-12 w-full items-center gap-2.5 rounded-control px-2 py-1.5 text-left transition-colors hover:bg-surface-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Benutzermenü"
      >
        <Avatar name={user()?.name ?? "–"} size="sm" />
        <span class="min-w-0 flex-1 leading-tight">
          <span class="block truncate text-sm font-medium text-content">{user()?.name ?? "–"}</span>
          <span class="block truncate text-xs text-content-muted">{user()?.email ?? ""}</span>
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content class={classesPopoverContentMerge("w-64 p-1.5")} aria-label="Benutzermenü">
          <div class="flex items-center gap-2.5 px-2.5 py-2">
            <Avatar name={user()?.name ?? "–"} size="sm" />
            <span class="min-w-0 flex-1 leading-tight">
              <span class="block truncate text-sm font-medium text-content">{user()?.name ?? "–"}</span>
              <span class="block truncate text-xs text-content-muted">{user()?.email ?? ""}</span>
            </span>
          </div>
          <div class="my-1 h-px bg-border-subtle" role="separator" />
          <Button
            variant={buttonVariant.ghost}
            class={dashUserMenuRowClass}
            onClick={() => {
              open.set(false)
              dashExternOpen("/demo/customer/konto")
            }}
          >
            <Icon path={mdiAccountCircleOutline} class="size-4 shrink-0" />
            <span class="flex-1 truncate text-left">Kundenkonto</span>
          </Button>
          <Button
            variant={buttonVariant.ghost}
            class={dashUserMenuRowClass}
            onClick={() => {
              themeRotate()
              open.set(false)
            }}
          >
            <Icon path={themeIcon(themeSignal.get())} class="size-4 shrink-0" />
            <span class="flex-1 truncate text-left">Darstellung: {dashThemeLabel()}</span>
          </Button>
          <Button
            variant={buttonVariant.ghost}
            class={dashUserMenuRowClass}
            onClick={() => {
              open.set(false)
              toastAdd({ title: "In der Demo nicht möglich" })
            }}
          >
            <Icon path={mdiLogout} class="size-4 shrink-0" />
            <span class="flex-1 truncate text-left">Abmelden</span>
          </Button>
        </Popover.Content>
      </Popover.Portal>
    </Popover>
  )
}
