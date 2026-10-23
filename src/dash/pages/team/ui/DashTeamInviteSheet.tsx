import { mdiCheck } from "@adaptive-ds/mdi/mdiCheck.js"
import { cn } from "cn"
import { For, Show } from "solid-js"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Sheet } from "#ui/interactive/sheet/Sheet.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"

import { dashRoleLabel } from "../../../model/dashRoleLabel.ts"
import type { DashRole } from "../../../model/dashRoleSchema.ts"
import { DashField } from "../../../ui/layout/DashField.tsx"
import type { DashTeamInviteState } from "../model/dashTeamInviteStateCreate.ts"

const dashTeamInviteRoles: DashRole[] = ["inhaber", "admin", "eventmanager", "finanzen", "einlass"]

/** Sheet „Mitglied einladen“: E-Mail-Textarea mit Live-Zähler und Rollen-Radio-Karten. */
export function DashTeamInviteSheet(p: { open: boolean; onClose: () => void; state: DashTeamInviteState }) {
  const close = () => {
    p.state.reset()
    p.onClose()
  }

  return (
    <Sheet
      open={p.open}
      onOpenChange={(open) => {
        if (!open) close()
      }}
      title="Mitglied einladen"
      description="Mehrere Adressen mit Komma, Semikolon oder Zeilenumbruch trennen."
      size="md"
      footer={
        <div class="ms-auto flex gap-2">
          <Button type="button" variant="outline" class="h-9 px-3 text-sm" onClick={close}>
            Abbrechen
          </Button>
          <Button type="button" variant="contrast" class="h-9 px-3 text-sm" onClick={() => p.state.invite()}>
            Einladen
          </Button>
        </div>
      }
    >
      <div class="flex flex-col gap-5">
        <DashField label="E-Mail-Adressen" for="dash-team-emails" required>
          <Textarea
            id="dash-team-emails"
            value={p.state.emails.get()}
            onInput={(event) => p.state.emails.set(event.currentTarget.value)}
            placeholder={"mara@example.de, jonas@example.de"}
            rows={4}
          />
          <Show
            when={p.state.emails.get().trim() !== ""}
            fallback={<p class="text-xs text-content-muted">Noch keine Adressen eingetragen.</p>}
          >
            <p class="text-xs text-content-muted">
              {p.state.parsed().valid.length} gültig · {p.state.parsed().invalid.length} ungültig
            </p>
          </Show>
          <Show when={p.state.showErrors.get() && p.state.parsed().invalid.length > 0}>
            <p role="alert" class="text-xs text-danger">
              Bitte prüfe: {p.state.parsed().invalid.join(", ")}
            </p>
          </Show>
        </DashField>
        <fieldset>
          <legend class="mb-2 text-sm font-medium text-content">Rolle</legend>
          <div class="grid gap-2 sm:grid-cols-2">
            <For each={dashTeamInviteRoles}>
              {(role) => {
                const meta = dashRoleLabel(role)
                const selected = () => p.state.role.get() === role
                return (
                  <Button
                    variant="outline"
                    aria-pressed={selected()}
                    onClick={() => p.state.role.set(role)}
                    class={cn(
                      "h-auto items-start justify-start p-3 text-left",
                      selected() && "border-ring ring-2 ring-brand/30",
                    )}
                  >
                    <span class="flex w-full items-start gap-2.5">
                      <Icon path={meta.icon} class="mt-0.5 size-5 shrink-0 text-content-muted" />
                      <span class="min-w-0 flex-1">
                        <span class="block text-sm font-medium text-content">{meta.label}</span>
                        <span class="block text-xs font-normal text-content-muted">{meta.description}</span>
                      </span>
                      <Show when={selected()}>
                        <Icon path={mdiCheck} class="mt-0.5 size-4 shrink-0 text-success" />
                      </Show>
                    </span>
                  </Button>
                )
              }}
            </For>
          </div>
        </fieldset>
      </div>
    </Sheet>
  )
}
