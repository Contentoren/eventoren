import { For, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { VeranstalterDashboardPageFrame } from "../../ui/VeranstalterDashboardPageFrame.tsx"
import { veranstalterDashboardGaestelistePageStateCreate } from "./veranstalterDashboardGaestelistePageStateCreate.ts"
import { veranstalterDashboardGaestelisteTimeFormat } from "./veranstalterDashboardGaestelisteTimeFormat.ts"
import type { VeranstalterDashboardGaestelisteSearch } from "./veranstalterDashboardGaestelisteSearchParse.ts"

export function VeranstalterDashboardGaestelistePage(p: {
  search: () => VeranstalterDashboardGaestelisteSearch
  changeSearch: (search: VeranstalterDashboardGaestelisteSearch) => void
  eventKey: () => string | undefined
}) {
  const state = veranstalterDashboardGaestelistePageStateCreate(p)
  let quotaName = "",
    quotaLimit = "20",
    guestName = "",
    guestEmail = "",
    guestPlusOnes = "0"
  return (
    <VeranstalterDashboardPageFrame state={state.shell}>
      <section class="flex flex-col gap-4">
        <h1 class="text-2xl font-semibold">Gästeliste</h1>
        <Show when={state.canEdit()} fallback={<p role="alert">Keine Berechtigung für diesen Bereich.</p>}>
          <Show when={state.scopeError()}>{(scopeError) => <p role="alert">{scopeError()}</p>}</Show>
          <form onSubmit={state.filtersSubmit} role="search" class="flex flex-wrap items-center gap-2">
            <Input
              type="search"
              aria-label="Suche"
              maxLength={100}
              value={state.draftQuery()}
              onInput={(event) => state.queryChange(event.currentTarget.value)}
              placeholder="Name, E-Mail"
              class="max-w-md"
            />
            <Button type="submit" variant="outline">
              Suchen
            </Button>
          </form>
          <Show when={state.message.get()}>
            <p role="status">{state.message.get()}</p>
          </Show>
          <ul class="flex flex-wrap gap-2">
            <For each={state.quotas()} fallback={<li>Keine Kontingente.</li>}>
              {(quota) => (
                <li class="rounded-card border border-border-subtle bg-surface p-3">
                  <p class="font-medium">{quota.name}</p>
                  <p class="text-sm text-content-muted">
                    {quota.seats} / {quota.limit} Plätze · {quota.guests} Gäste
                  </p>
                </li>
              )}
            </For>
          </ul>
          <form
            class="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              const orgId = state.shell.activeOrganization()?.id,
                eventKey = p.eventKey()
              if (!orgId || !eventKey) return
              void state.run(() =>
                state.mutations.quotaUpsert(orgId, eventKey, {
                  name: quotaName,
                  limit: Number(quotaLimit),
                }),
              )
            }}
          >
            <label class="flex flex-col gap-1 text-sm">
              Kontingent
              <Input aria-label="Kontingentname" maxLength={120} onInput={(e) => (quotaName = e.currentTarget.value)} />
            </label>
            <label class="flex flex-col gap-1 text-sm">
              Limit
              <Input
                aria-label="Kontingentlimit"
                type="number"
                min={1}
                value={quotaLimit}
                onInput={(e) => (quotaLimit = e.currentTarget.value)}
              />
            </label>
            <Button type="submit" variant="outline" disabled={state.busy.get()}>
              Kontingent speichern
            </Button>
          </form>
          <form
            class="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              const orgId = state.shell.activeOrganization()?.id,
                eventKey = p.eventKey()
              if (!orgId || !eventKey) return
              void state.run(() =>
                state.mutations.guestUpsert(orgId, eventKey, {
                  name: guestName,
                  ...(guestEmail.trim() ? { email: guestEmail.trim() } : {}),
                  plusOnes: Number(guestPlusOnes),
                }),
              )
            }}
          >
            <label class="flex flex-col gap-1 text-sm">
              Name
              <Input aria-label="Gastname" maxLength={240} onInput={(e) => (guestName = e.currentTarget.value)} />
            </label>
            <label class="flex flex-col gap-1 text-sm">
              E-Mail (optional)
              <Input aria-label="Gast-E-Mail" type="email" onInput={(e) => (guestEmail = e.currentTarget.value)} />
            </label>
            <label class="flex flex-col gap-1 text-sm">
              Begleitung (0–5)
              <Input
                aria-label="Begleitpersonen"
                type="number"
                min={0}
                max={5}
                value={guestPlusOnes}
                onInput={(e) => (guestPlusOnes = e.currentTarget.value)}
              />
            </label>
            <Button type="submit" variant="outline" disabled={state.busy.get()}>
              Gast hinzufügen
            </Button>
          </form>
          <Show when={state.guestsLoading()}>
            <p role="status">Lädt …</p>
          </Show>
          <ul class="flex flex-col gap-2">
            <For each={state.guests()} fallback={<li>Keine Gäste in diesem Fenster.</li>}>
              {(guest) => (
                <li class="rounded-card border border-border-subtle bg-surface p-3">
                  <p class="font-medium">
                    {guest.name} <span class="text-sm text-content-muted">+{guest.plusOnes}</span>
                  </p>
                  <p class="text-sm">
                    {guest.quotaName ?? "Ohne Kontingent"} · {guest.ticketSent ? "Ticket gesendet" : "Kein Ticket"} ·{" "}
                    {guest.checkedInAt
                      ? `Eingecheckt: ${veranstalterDashboardGaestelisteTimeFormat(guest.checkedInAt)}`
                      : "Nicht eingecheckt"}
                  </p>
                  <div class="mt-2 flex flex-wrap gap-2">
                    <Show when={!guest.ticketSent}>
                      <Button
                        variant="outline"
                        disabled={state.busy.get()}
                        onClick={() => {
                          const orgId = state.shell.activeOrganization()?.id
                          if (orgId) void state.run(() => state.mutations.ticketSend(orgId, guest.guestId))
                        }}
                      >
                        Ticket senden
                      </Button>
                    </Show>
                    <Show when={!guest.checkedInAt}>
                      <Button
                        variant="outline"
                        disabled={state.busy.get()}
                        onClick={() => {
                          const orgId = state.shell.activeOrganization()?.id
                          if (orgId) void state.run(() => state.mutations.checkIn(orgId, guest.guestId, "Haupteingang"))
                        }}
                      >
                        Einchecken
                      </Button>
                    </Show>
                    <Show when={guest.checkedInAt}>
                      <Button
                        variant="ghost"
                        disabled={state.busy.get()}
                        onClick={() => {
                          const orgId = state.shell.activeOrganization()?.id
                          if (orgId) void state.run(() => state.mutations.checkInUndo(orgId, guest.guestId))
                        }}
                      >
                        Check-in zurücknehmen
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
