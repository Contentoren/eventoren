import { For, Show } from "solid-js"
import { mdiCheck } from "@adaptive-ds/mdi/mdiCheck.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"

import type { DashPermission } from "../../../model/dashPermissionSchema.ts"
import { dashRoleLabel } from "../../../model/dashRoleLabel.ts"
import { dashRolePermissions } from "../../../model/dashRolePermissions.ts"
import type { DashRole } from "../../../model/dashRoleSchema.ts"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

const dashTeamRoles: DashRole[] = ["inhaber", "admin", "eventmanager", "finanzen", "einlass"]

const dashTeamPermissionGroups: { area: string; permissions: DashPermission[] }[] = [
  {
    area: "Events",
    permissions: ["events.bearbeiten", "tickets.bearbeiten", "codes.bearbeiten", "nachrichten.senden"],
  },
  {
    area: "Tickets & Codes",
    permissions: ["gaesteliste.bearbeiten", "bestellungen.sehen", "bestellungen.verwalten", "bestellungen.erstatten"],
  },
  { area: "Einlass & Abendkasse", permissions: ["einlass.nutzen", "abendkasse.nutzen", "abendkasse.preise"] },
  { area: "Finanzen & Gutscheine", permissions: ["umsatz.sehen", "finanzen.sehen", "gutscheine.bearbeiten"] },
  {
    area: "Organisation",
    permissions: ["profil.bearbeiten", "team.verwalten", "einstellungen.bearbeiten", "bank.bearbeiten"],
  },
]

const dashTeamPermissionLabels: Record<DashPermission, string> = {
  "events.bearbeiten": "Events bearbeiten",
  "tickets.bearbeiten": "Tickets bearbeiten",
  "codes.bearbeiten": "Codes bearbeiten",
  "bestellungen.sehen": "Bestellungen sehen",
  "bestellungen.verwalten": "Bestellungen verwalten",
  "bestellungen.erstatten": "Erstattungen",
  "gaesteliste.bearbeiten": "Gästeliste",
  "nachrichten.senden": "Nachrichten senden",
  "einlass.nutzen": "Einlass nutzen",
  "abendkasse.nutzen": "Abendkasse nutzen",
  "abendkasse.preise": "Abendkassen-Preise",
  "umsatz.sehen": "Umsatz sehen",
  "finanzen.sehen": "Finanzen sehen",
  "gutscheine.bearbeiten": "Gutscheine",
  "profil.bearbeiten": "Profil bearbeiten",
  "team.verwalten": "Team verwalten",
  "einstellungen.bearbeiten": "Einstellungen",
  "bank.bearbeiten": "Bankdaten",
}

const dashTeamRolePermissions = new Map<DashRole, ReadonlySet<DashPermission>>(
  dashTeamRoles.map((role) => [role, dashRolePermissions(role)]),
)

/** Karte „Rollen & Rechte“: Matrix Bereiche × Rollen mit ✓ / – (einklappbar). */
export function DashTeamMatrix() {
  const open = createSignalObject(true)

  return (
    <DashSection
      title="Rollen & Rechte"
      description="Welche Rolle darf was in deiner Organisation."
      actions={
        <Button
          variant="ghost"
          class="h-9 px-3 text-sm"
          aria-expanded={open.get()}
          onClick={() => open.set(!open.get())}
        >
          {open.get() ? "Einklappen" : "Ausklappen"}
        </Button>
      }
    >
      <Show when={open.get()}>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[640px] border-collapse text-sm">
            <caption class="sr-only" aria-label="Rollen und Rechte: welche Rolle darf was">
              Rollen und Rechte: welche Rolle darf was
            </caption>
            <thead>
              <tr class="border-b border-border-subtle text-left">
                <th scope="col" class="py-2 pr-3 font-medium text-content-muted">
                  Bereich
                </th>
                <For each={dashTeamRoles}>
                  {(role) => {
                    const meta = dashRoleLabel(role)
                    return (
                      <th scope="col" class="px-2 py-2 text-center font-medium text-content">
                        <span class="inline-flex items-center justify-center gap-1.5">
                          <Icon path={meta.icon} class="size-4 text-content-muted" />
                          {meta.label}
                        </span>
                      </th>
                    )
                  }}
                </For>
              </tr>
            </thead>
            <tbody>
              <For each={dashTeamPermissionGroups}>
                {(group) => (
                  <>
                    <tr>
                      <td
                        colspan={dashTeamRoles.length + 1}
                        class="pt-3 pb-1 text-xs font-semibold tracking-wide text-content-muted uppercase"
                      >
                        {group.area}
                      </td>
                    </tr>
                    <For each={group.permissions}>
                      {(permission) => (
                        <tr class="border-b border-border-subtle/60 last:border-0">
                          <th scope="row" class="py-1.5 pr-3 text-left font-normal text-content">
                            {dashTeamPermissionLabels[permission]}
                          </th>
                          <For each={dashTeamRoles}>
                            {(role) => (
                              <td class="px-2 py-1.5 text-center">
                                {dashTeamRolePermissions.get(role)?.has(permission) === true ? (
                                  <span>
                                    <Icon path={mdiCheck} class="mx-auto size-4 text-success" />
                                    <span class="sr-only">erlaubt</span>
                                  </span>
                                ) : (
                                  <span>
                                    <span aria-hidden="true" class="text-content-muted">
                                      –
                                    </span>
                                    <span class="sr-only">nicht erlaubt</span>
                                  </span>
                                )}
                              </td>
                            )}
                          </For>
                        </tr>
                      )}
                    </For>
                  </>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
    </DashSection>
  )
}
