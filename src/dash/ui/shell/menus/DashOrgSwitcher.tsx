import { mdiCheck } from "@adaptive-ds/mdi/mdiCheck.js"
import { mdiOpenInNew } from "@adaptive-ds/mdi/mdiOpenInNew.js"
import { mdiPlus } from "@adaptive-ds/mdi/mdiPlus.js"
import { mdiUnfoldMoreHorizontal } from "@adaptive-ds/mdi/mdiUnfoldMoreHorizontal.js"
import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CorvuPopover } from "#ui/interactive/popover/CorvuPopover.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { dashRoleLabel } from "../../../model/dashRoleLabel.ts"
import { DashOrgLogo } from "../../org/DashOrgLogo.tsx"
import { dashOrgSwitcherStateCreate } from "./dashOrgSwitcherStateCreate.ts"

export function DashOrgSwitcher() {
  const state = dashOrgSwitcherStateCreate()
  return (
    <CorvuPopover
      variant="ghost"
      size="none"
      class="flex h-12 w-full items-center gap-2.5 rounded-control px-2 py-1.5"
      innerClass="w-72 p-1"
      open={state.open.get()}
      onOpenChange={state.open.set}
      buttonChildren={
        <>
          <DashOrgLogo
            name={state.active()?.name ?? "–"}
            logoDataUrl={state.active()?.logoDataUrl ?? null}
            size="md"
            shape="rounded"
            class="size-8 text-xs"
          />
          <span class="min-w-0 flex-1 text-left leading-tight">
            <span class="block truncate text-sm font-semibold text-content">{state.active()?.name ?? "–"}</span>
            <Show when={state.activeRoleLabel()}>
              {(label) => <span class="block truncate text-xs text-content-muted">{label()}</span>}
            </Show>
          </span>
          <Icon path={mdiUnfoldMoreHorizontal} class="size-4 shrink-0 text-content-muted" />
        </>
      }
    >
      <p class="px-2 py-1.5 text-xs font-medium text-content-muted">Organisationen</p>
      <For each={state.orgs()}>
        {({ org, member }) => (
          <Button
            variant="ghost"
            size="none"
            onClick={() => state.select(org.id, org.name)}
            aria-current={state.active()?.id === org.id ? "true" : undefined}
            class="flex h-10 w-full items-center gap-2.5 rounded-md px-2 text-left hover:bg-surface-muted"
          >
            <DashOrgLogo name={org.name} logoDataUrl={org.logoDataUrl} size="sm" shape="rounded" />
            <span class="min-w-0 flex-1 leading-tight">
              <span class="block truncate text-sm text-content">{org.name}</span>
              <span class="block truncate text-xs text-content-muted">{dashRoleLabel(member.role).label}</span>
            </span>
            <Show when={state.active()?.id === org.id}>
              <Icon path={mdiCheck} class="size-4 shrink-0 text-content" />
            </Show>
          </Button>
        )}
      </For>
      <div class="my-1 border-t border-border-subtle" />
      <Button
        variant="ghost"
        size="none"
        onClick={() => state.create()}
        class="flex h-10 w-full items-center gap-2.5 rounded-md px-2 text-left hover:bg-surface-muted"
      >
        <Icon path={mdiPlus} class="size-4 shrink-0 text-content-muted" />
        <span class="min-w-0 flex-1 truncate text-sm text-content">Organisation erstellen</span>
      </Button>
      <Show when={state.publicHref()}>
        {(href) => (
          <a
            href={href()}
            target="_blank"
            rel="noreferrer"
            onClick={() => state.open.set(false)}
            class="flex h-10 w-full items-center gap-2.5 rounded-md px-2 text-left hover:bg-surface-muted"
          >
            <Icon path={mdiOpenInNew} class="size-4 shrink-0 text-content-muted" />
            <span class="min-w-0 flex-1 truncate text-sm text-content">Öffentliches Profil</span>
          </a>
        )}
      </Show>
    </CorvuPopover>
  )
}
