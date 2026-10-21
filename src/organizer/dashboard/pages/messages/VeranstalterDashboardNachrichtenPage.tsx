import { For, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { VeranstalterDashboardPageFrame } from "../../ui/VeranstalterDashboardPageFrame.tsx"
import { veranstalterDashboardNachrichtenPageStateCreate } from "./veranstalterDashboardNachrichtenPageStateCreate.ts"
import { veranstalterDashboardNachrichtenTimeFormat } from "./veranstalterDashboardNachrichtenTimeFormat.ts"
import type { VeranstalterDashboardNachrichtenSearch } from "./veranstalterDashboardNachrichtenSearchParse.ts"

const kinds = ["info", "aenderung", "absage", "erinnerung"] as const
const audiences = ["alle", "ticketarten", "eingecheckt", "nicht-eingecheckt"] as const

export function VeranstalterDashboardNachrichtenPage(p: {
  search: () => VeranstalterDashboardNachrichtenSearch
  changeSearch: (search: VeranstalterDashboardNachrichtenSearch) => void
  eventKey: () => string | undefined
}) {
  const state = veranstalterDashboardNachrichtenPageStateCreate(p)
  let subject = "",
    body = "",
    kind: (typeof kinds)[number] = "info",
    audience: (typeof audiences)[number] = "alle",
    directions = ""
  return (
    <VeranstalterDashboardPageFrame state={state.shell}>
      <section class="flex flex-col gap-4">
        <h1 class="text-2xl font-semibold">Nachrichten</h1>
        <Show when={state.canSend()} fallback={<p role="alert">Keine Berechtigung für diesen Bereich.</p>}>
          <Show when={state.message.get()}>
            <p role="status">{state.message.get()}</p>
          </Show>
          <Show when={state.reminderData()}>
            {(reminder) => (
              <div class="rounded-md border border-input p-3">
                <h2 class="font-medium">Automatische Erinnerung</h2>
                <p class="text-sm text-content-muted">
                  {reminder().enabled ? "Eingeschaltet" : "Ausgeschaltet"} · {reminder().hoursBefore} h vor Beginn ·{" "}
                  {reminder().sentAt
                    ? `Gesendet: ${veranstalterDashboardNachrichtenTimeFormat(reminder().sentAt ?? "")}`
                    : "Noch nicht gesendet"}
                </p>
                <div class="mt-2 flex flex-wrap gap-2">
                  <Show when={state.icsDownload()}>
                    {(download) => (
                      <a
                        class="underline text-sm"
                        href={`data:text/calendar;charset=utf-8,${encodeURIComponent(download().ics)}`}
                        download={download().filename}
                      >
                        Kalendereintrag (.ics) laden
                      </a>
                    )}
                  </Show>
                </div>
                <form
                  class="mt-2 flex flex-wrap items-end gap-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    const orgId = state.shell.activeOrganization()?.id,
                      eventKey = p.eventKey()
                    if (!orgId || !eventKey) return
                    void state.run(() =>
                      state.mutations.reminderUpdate(orgId, eventKey, {
                        enabled: !reminder().enabled,
                        hoursBefore: reminder().hoursBefore,
                        directions: directions || reminder().directions,
                        calendar: reminder().calendar,
                      }),
                    )
                  }}
                >
                  <label class="flex flex-col gap-1 text-sm">
                    Anfahrt
                    <Input
                      aria-label="Anfahrt"
                      maxLength={2000}
                      value={reminder().directions}
                      onInput={(e) => (directions = e.currentTarget.value)}
                    />
                  </label>
                  <Button type="submit" variant="outline" disabled={state.busy.get()}>
                    {reminder().enabled ? "Erinnerung ausschalten" : "Erinnerung einschalten"}
                  </Button>
                </form>
              </div>
            )}
          </Show>
          <form
            class="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              const orgId = state.shell.activeOrganization()?.id,
                eventKey = p.eventKey()
              if (!orgId || !eventKey) return
              void state.run(() =>
                state.mutations.create(orgId, eventKey, {
                  kind,
                  audience: { type: audience, tierKeys: [] },
                  subject,
                  body,
                }),
              )
            }}
          >
            <label class="flex flex-col gap-1 text-sm">
              Betreff
              <Input aria-label="Betreff" maxLength={200} onInput={(e) => (subject = e.currentTarget.value)} />
            </label>
            <label class="flex flex-col gap-1 text-sm">
              Text
              <Input aria-label="Nachrichtentext" maxLength={10000} onInput={(e) => (body = e.currentTarget.value)} />
            </label>
            <label class="flex flex-col gap-1 text-sm">
              Art
              <select aria-label="Art" onChange={(e) => (kind = e.currentTarget.value as typeof kind)}>
                <For each={kinds}>{(entry) => <option value={entry}>{entry}</option>}</For>
              </select>
            </label>
            <label class="flex flex-col gap-1 text-sm">
              Empfänger
              <select aria-label="Empfänger" onChange={(e) => (audience = e.currentTarget.value as typeof audience)}>
                <For each={audiences}>{(entry) => <option value={entry}>{entry}</option>}</For>
              </select>
            </label>
            <Button type="submit" variant="outline" disabled={state.busy.get()}>
              Entwurf speichern
            </Button>
          </form>
          <ul class="flex flex-col gap-2">
            <For each={state.rows()} fallback={<li>Keine Nachrichten.</li>}>
              {(row) => (
                <li class="rounded-md border border-input p-3">
                  <p class="font-medium">{row.subject}</p>
                  <p class="text-sm text-content-muted">
                    {row.kind} · {row.audienceType} · {row.recipientCount} Empfänger · {row.status} ·{" "}
                    {row.deliveryState}
                    {row.sentAt ? ` · Gesendet: ${veranstalterDashboardNachrichtenTimeFormat(row.sentAt)}` : ""}
                    {row.deliveryReason ? ` · ${row.deliveryReason}` : ""}
                  </p>
                  <div class="mt-2 flex flex-wrap gap-2">
                    <Show when={row.status !== "gesendet"}>
                      <Button
                        variant="outline"
                        disabled={state.busy.get()}
                        onClick={() => {
                          const orgId = state.shell.activeOrganization()?.id
                          if (orgId) void state.run(() => state.mutations.send(orgId, row.messageId))
                        }}
                      >
                        Jetzt senden
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={state.busy.get()}
                        onClick={() => {
                          const orgId = state.shell.activeOrganization()?.id
                          if (orgId) void state.run(() => state.mutations.remove(orgId, row.messageId))
                        }}
                      >
                        Löschen
                      </Button>
                    </Show>
                  </div>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </section>
    </VeranstalterDashboardPageFrame>
  )
}
