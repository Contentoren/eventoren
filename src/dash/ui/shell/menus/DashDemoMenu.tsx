import { mdiAccountPlusOutline } from "@adaptive-ds/mdi/mdiAccountPlusOutline.js"
import { mdiCartPlus } from "@adaptive-ds/mdi/mdiCartPlus.js"
import { mdiCheck } from "@adaptive-ds/mdi/mdiCheck.js"
import { mdiFlaskOutline } from "@adaptive-ds/mdi/mdiFlaskOutline.js"
import { mdiRestore } from "@adaptive-ds/mdi/mdiRestore.js"
import { mdiViewGridOutline } from "@adaptive-ds/mdi/mdiViewGridOutline.js"
import { useNavigate } from "@tanstack/solid-router"
import { Show } from "solid-js"
import { dashRoleLabel } from "#src/dash/model/dashRoleLabel.ts"
import type { DashRole } from "#src/dash/model/dashRoleSchema.ts"
import { dashActiveRole } from "#src/dash/store/dashActiveRole.ts"
import { dashSessionRoleSimulate } from "#src/dash/store/dashSessionRoleSimulate.ts"
import { dashSessionUser } from "#src/dash/store/dashSessionUser.ts"
import { dashStoreReset } from "#src/dash/store/dashStoreReset.ts"
import { dashStoreResetEmpty } from "#src/dash/store/dashStoreResetEmpty.ts"
import { dashUserOrgs } from "#src/dash/store/dashUserOrgs.ts"
import { ConfirmDialog } from "#ui/interactive/dialog/ConfirmDialog.jsx"
import { DropdownMenu, type DropdownMenuEntry } from "#ui/interactive/menu/DropdownMenu.jsx"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { dashDemoMenuStateCreate } from "./dashDemoMenuStateCreate.ts"

const dashDemoRoles: ReadonlyArray<DashRole> = ["inhaber", "admin", "eventmanager", "finanzen", "einlass"]

/** Schmale Demo-Pille in der Topbar: Rolle simulieren, Testbestellungen, Reset, Verzeichnis. */
export function DashDemoMenu() {
  const state = dashDemoMenuStateCreate()
  const navigate = useNavigate()
  const pending = createSignalObject(false)
  const go = (href: string) => {
    void navigate({ to: href })
  }
  const goExternal = (href: string) => {
    if (typeof window !== "undefined") window.location.assign(href)
    else void navigate({ to: href })
  }
  const membershipRole = (): DashRole | null => {
    const user = dashSessionUser()
    if (!user) return null
    const entry = dashUserOrgs().find((candidate) => candidate.member.userId === user.id)
    return entry?.member.role ?? null
  }
  const effectiveRole = () => dashActiveRole()
  const pendingLabel = () => (pending.get() ? " …" : "")
  const items = (): Array<DropdownMenuEntry> => {
    const entries: Array<DropdownMenuEntry> = [{ type: "label", label: "Rolle simulieren" }]
    for (const role of dashDemoRoles) {
      const label = dashRoleLabel(role).label
      const active = effectiveRole() === role
      entries.push({
        type: "item",
        id: `rolle-${role}`,
        label,
        icon: active ? mdiCheck : dashRoleLabel(role).icon,
        hint: active ? "aktiv" : undefined,
        onSelect: () => {
          const base = membershipRole()
          dashSessionRoleSimulate(role === base ? null : role)
          toastAdd({ title: `Rolle: ${label}` })
        },
      })
    }
    entries.push({ type: "separator" })
    entries.push({
      type: "item",
      id: "testbestellungen",
      label: `Testbestellungen erzeugen${pendingLabel()}`,
      icon: mdiCartPlus,
      onSelect: () => {
        if (pending.get()) return
        pending.set(true)
        void import("#src/dash/ui/shell/menus/dashDemoOrdersGenerate.ts").then(
          (module) => {
            try {
              const generated = module.dashDemoOrdersGenerate({
                count: 10,
                random: () => Math.random(),
              })
              toastAdd({
                title: generated.success ? "10 Testbestellungen erzeugt" : generated.errorMessage,
              })
            } finally {
              pending.set(false)
            }
          },
          () => {
            pending.set(false)
            toastAdd({ title: "Testbestellungen sind gleich verfügbar" })
          },
        )
      },
    })
    entries.push({ type: "separator" })
    entries.push({
      type: "item",
      id: "reset",
      label: "Demo zurücksetzen",
      icon: mdiRestore,
      onSelect: () => state.resetOpen.set(true),
    })
    entries.push({
      type: "item",
      id: "leeres-konto",
      label: "Leeres Konto",
      icon: mdiAccountPlusOutline,
      onSelect: () => {
        dashStoreResetEmpty()
        goExternal("/demo/onboarding")
      },
    })
    entries.push({
      type: "item",
      id: "verzeichnis",
      label: "Demo-Verzeichnis",
      icon: mdiViewGridOutline,
      onSelect: () => goExternal("/demo"),
    })
    return entries
  }
  return (
    <Show when={dashSessionUser() !== null}>
      <span class="inline-flex items-center">
        <DropdownMenu
          items={items()}
          triggerLabel="Demo"
          triggerIcon={mdiFlaskOutline}
          triggerAriaLabel="Demo-Menü"
          class="h-8 text-xs"
        />
        <ConfirmDialog
          open={state.resetOpen.get()}
          onOpenChange={(next) => state.resetOpen.set(next)}
          title="Demo zurücksetzen?"
          consequences={[{ text: "Alle Änderungen gehen verloren", icon: mdiRestore, tone: "warning" }]}
          confirmLabel="Zurücksetzen"
          onConfirm={() => {
            dashStoreReset()
            state.resetOpen.set(false)
            void navigate({ to: "/demo/dashboard" })
          }}
        />
      </span>
    </Show>
  )
}
