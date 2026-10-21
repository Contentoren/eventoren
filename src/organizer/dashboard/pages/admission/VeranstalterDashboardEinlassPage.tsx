import { For, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { VeranstalterDashboardPageFrame } from "../../ui/VeranstalterDashboardPageFrame.tsx"
import { veranstalterDashboardEinlassPageStateCreate } from "./veranstalterDashboardEinlassPageStateCreate.ts"
import type { VeranstalterDashboardEinlassSearch } from "./veranstalterDashboardEinlassSearchParse.ts"

const rejectedLabels: Record<string, string> = {
  doppelt: "Bereits eingecheckt",
  "falsches-event": "Falsche Veranstaltung",
  unbekannt: "Unbekannter Code",
  storniert: "Storniert",
  unbezahlt: "Nicht bezahlt",
}

export function VeranstalterDashboardEinlassPage(p: {
  search: () => VeranstalterDashboardEinlassSearch
  changeSearch: (search: VeranstalterDashboardEinlassSearch) => void
  eventKey: () => string
}) {
  const state = veranstalterDashboardEinlassPageStateCreate(p)
  return (
    <VeranstalterDashboardPageFrame state={state.shell}>
      <section class="flex flex-col gap-4">
        <h1 class="text-2xl font-semibold">Einlass</h1>
        <Show when={state.canView()} fallback={<p role="alert">Keine Berechtigung für diesen Bereich.</p>}>
          <Show when={state.stats()} fallback={<p>{state.statsError() ?? "Einlassdaten werden geladen …"}</p>}>
            {(data) => (
              <div class="flex flex-wrap gap-4">
                <p class="rounded-card border border-border-subtle bg-surface p-4">
                  <span class="block text-2xl font-semibold tabular-nums">{data().totals.checkedIn}</span>
                  <span class="text-xs text-content-muted">Eingecheckt von {data().totals.sold} gültigen Tickets</span>
                </p>
                <p class="rounded-card border border-border-subtle bg-surface p-4">
                  <span class="block text-2xl font-semibold tabular-nums">{data().totals.rejected}</span>
                  <span class="text-xs text-content-muted">Abgelehnte Scans</span>
                </p>
              </div>
            )}
          </Show>
          <Show when={state.stats()}>
            {(data) => (
              <>
                <h2 class="text-lg font-semibold">Je Ticketart</h2>
                <ul class="flex flex-col gap-2">
                  <For each={data().byTier}>
                    {(row) => (
                      <li class="rounded-card border border-border-subtle bg-surface p-4 text-sm">
                        <span class="font-medium">{row.tierName}</span>
                        <span class="text-content-muted">
                          {" "}
                          · {row.checkedIn}/{row.sold} eingecheckt · Kapazität {row.capacity}
                        </span>
                      </li>
                    )}
                  </For>
                </ul>
                <h2 class="text-lg font-semibold">Je Eingang</h2>
                <ul class="flex flex-col gap-2">
                  <For each={data().byEntrance}>
                    {(row) => (
                      <li class="rounded-card border border-border-subtle bg-surface p-4 text-sm">
                        <span class="font-medium">{row.entrance}</span>
                        <span class="text-content-muted">
                          {" "}
                          · {row.checkedIn} Einlass · {row.rejected} abgelehnt
                        </span>
                      </li>
                    )}
                  </For>
                </ul>
                <Show when={data().rejected.length > 0}>
                  <h2 class="text-lg font-semibold">Abgelehnte Scans nach Grund</h2>
                  <ul class="flex flex-col gap-2">
                    <For each={data().rejected}>
                      {(row) => (
                        <li class="rounded-card border border-border-subtle bg-surface p-4 text-sm">
                          <span class="font-medium">{rejectedLabels[row.result] ?? row.result}</span>
                          <span class="text-content-muted tabular-nums"> · {row.count}</span>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
              </>
            )}
          </Show>
          <Show when={state.canEnter()}>
            <h2 class="text-lg font-semibold">Manueller Check-in</h2>
            <form onSubmit={state.checkinSubmit} class="flex flex-wrap items-end gap-2">
              <label class="flex flex-col gap-1 text-sm">
                Eingang
                <Input
                  value={state.entrance.get()}
                  onInput={(event) => state.entrance.set(event.currentTarget.value)}
                  maxLength={60}
                  required
                />
              </label>
              <label class="flex flex-col gap-1 text-sm">
                Ticketcode
                <Input
                  value={state.ticketCode.get()}
                  onInput={(event) => state.ticketCode.set(event.currentTarget.value)}
                  maxLength={64}
                  required
                  autocomplete="off"
                />
              </label>
              <Button type="submit" variant="filled" disabled={state.busy()}>
                Einchecken
              </Button>
              <Button type="button" variant="outline" disabled={state.busy()} onClick={state.revokeScan}>
                Zurücknehmen
              </Button>
            </form>
            <Show when={state.message()}>
              <p aria-live="polite" class="text-sm">
                {state.message()}
              </p>
            </Show>
            <h2 class="text-lg font-semibold">Scanner-Links für Aushilfen</h2>
            <ul class="flex flex-col gap-2">
              <For each={state.links()} fallback={<li class="text-sm text-content-muted">Keine Scanner-Links.</li>}>
                {(link) => (
                  <li class="flex flex-wrap items-center gap-2 rounded-card border border-border-subtle bg-surface p-4 text-sm">
                    <span class="font-medium">{link.label}</span>
                    <Show when={link.entrance}>
                      <span class="text-content-muted">· {link.entrance}</span>
                    </Show>
                    <Show when={link.revokedAt !== null}>
                      <span class="text-content-muted">(widerrufen)</span>
                    </Show>
                    <Show when={state.canGrantLinks() && link.revokedAt === null}>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={state.busy()}
                        onClick={() => void state.revokeLink(link.linkId)}
                      >
                        Widerrufen
                      </Button>
                    </Show>
                  </li>
                )}
              </For>
            </ul>
            <Show when={state.canGrantLinks()}>
              <form onSubmit={state.createLink} class="flex flex-wrap items-end gap-2">
                <label class="flex flex-col gap-1 text-sm">
                  Name
                  <Input
                    value={state.linkLabel.get()}
                    onInput={(event) => state.linkLabel.set(event.currentTarget.value)}
                    maxLength={120}
                    required
                  />
                </label>
                <label class="flex flex-col gap-1 text-sm">
                  Eingang (optional)
                  <Input
                    value={state.linkEntrance.get()}
                    onInput={(event) => state.linkEntrance.set(event.currentTarget.value)}
                    maxLength={60}
                  />
                </label>
                <Button type="submit" variant="filled" disabled={state.busy()}>
                  Link erstellen
                </Button>
              </form>
            </Show>
          </Show>
        </Show>
      </section>
    </VeranstalterDashboardPageFrame>
  )
}
