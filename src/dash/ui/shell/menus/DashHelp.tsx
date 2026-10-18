import { mdiHelpCircleOutline } from "@adaptive-ds/mdi/mdiHelpCircleOutline.js"
import { mdiKeyboardOutline } from "@adaptive-ds/mdi/mdiKeyboardOutline.js"
import { mdiOpenInNew } from "@adaptive-ds/mdi/mdiOpenInNew.js"
import { mdiRocketLaunchOutline } from "@adaptive-ds/mdi/mdiRocketLaunchOutline.js"
import Popover from "@corvu/popover"
import { Link } from "@tanstack/solid-router"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { classesPopoverContentMerge } from "#ui/interactive/popover/classesPopoverContent.js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { Kbd } from "#ui/static/kbd/Kbd.jsx"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

const dashHelpRowClass = "h-9 w-full justify-start gap-2 px-2.5 text-sm font-normal"

function dashExternOpen(href: string) {
  if (typeof window === "undefined") return
  window.open(href, "_blank", "noopener,noreferrer")
}

/** Sidebar-Hilfe als Popover mit 3 Links. */
export function DashHelp() {
  const open = createSignalObject(false)
  return (
    <Popover open={open.get()} onOpenChange={(next) => open.set(next)}>
      <Popover.Trigger
        type="button"
        class="flex h-9 w-full items-center gap-2.5 rounded-control px-2.5 text-sm text-content-muted transition-colors hover:bg-surface-muted hover:text-content focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Hilfe"
      >
        <Icon path={mdiHelpCircleOutline} class="size-[18px] shrink-0" />
        <span>Hilfe</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content class={classesPopoverContentMerge("w-72 p-1.5")} aria-label="Hilfe">
          <p class="px-2.5 pt-1.5 pb-1 text-xs font-semibold text-content-muted">Hilfe</p>
          <Link
            to="/demo/dashboard/events/neu"
            onClick={() => open.set(false)}
            class="flex h-9 w-full items-center justify-start gap-2 rounded-md px-2.5 text-sm font-normal transition-colors hover:bg-surface-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Icon path={mdiRocketLaunchOutline} class="size-4 shrink-0" />
            <span class="flex-1 truncate text-left">Erste Schritte</span>
          </Link>
          <div
            class="flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-sm"
            role="note"
            aria-label="Tastenkürzel"
          >
            <Icon path={mdiKeyboardOutline} class="size-4 shrink-0 text-content-muted" />
            <span class="flex-1 truncate text-left text-content-muted">Befehlspalette öffnen</span>
            <Kbd>⌘K</Kbd>
          </div>
          <Button
            variant={buttonVariant.ghost}
            class={dashHelpRowClass}
            onClick={() => {
              open.set(false)
              dashExternOpen("/demo/contact")
            }}
          >
            <Icon path={mdiOpenInNew} class="size-4 shrink-0" />
            <span class="flex-1 truncate text-left">Support kontaktieren</span>
          </Button>
        </Popover.Content>
      </Popover.Portal>
    </Popover>
  )
}
