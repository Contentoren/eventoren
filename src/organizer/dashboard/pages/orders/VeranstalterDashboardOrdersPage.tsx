import { Link } from "@tanstack/solid-router"
import { For, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { SelectSingle } from "#ui/input/select/SelectSingle.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Sheet } from "#ui/interactive/sheet/Sheet.jsx"
import { VeranstalterDashboardPageFrame } from "../../ui/VeranstalterDashboardPageFrame.tsx"
import { VeranstalterDashboardOrderDetail } from "./VeranstalterDashboardOrderDetail.tsx"
import { veranstalterDashboardOrdersPageStateCreate } from "./veranstalterDashboardOrdersPageStateCreate.ts"
import { veranstalterDashboardOrdersTimeFormat } from "./veranstalterDashboardOrdersTimeFormat.ts"
import { veranstalterDashboardOrdersMoneyFormat } from "./veranstalterDashboardOrdersMoneyFormat.ts"
import type { VeranstalterDashboardOrdersSearch } from "./veranstalterDashboardOrdersSearchParse.ts"

export function VeranstalterDashboardOrdersPage(p: {
  search: () => VeranstalterDashboardOrdersSearch
  changeSearch: (search: VeranstalterDashboardOrdersSearch) => void
  eventKey: () => string | undefined
  participants: boolean
}) {
  const state = veranstalterDashboardOrdersPageStateCreate(p)
  return (
    <VeranstalterDashboardPageFrame state={state.shell}>
      <section class="flex flex-col gap-4">
        <h1 class="text-2xl font-semibold">{p.participants ? "Teilnehmer" : "Bestellungen"}</h1>
        <Show when={p.eventKey()}>
          {(eventKey) => (
            <nav aria-label="Veranstaltungslisten" class="flex flex-wrap gap-4 text-sm">
              <span class="text-content-muted">Veranstaltung: {eventKey()}</span>
              <Show when={state.canRead()}>
                <Link
                  to="/veranstalter/events/$eventKey/bestellungen"
                  params={{ eventKey: eventKey() }}
                  search={{ org: state.shell.activeOrganization()?.id }}
                  class="underline"
                >
                  Bestellungen dieses Events
                </Link>
              </Show>
              <Show when={state.canParticipate()}>
                <Link
                  to="/veranstalter/events/$eventKey/teilnehmer"
                  params={{ eventKey: eventKey() }}
                  search={{ org: state.shell.activeOrganization()?.id }}
                  class="underline"
                >
                  Teilnehmer dieses Events
                </Link>
              </Show>
            </nav>
          )}
        </Show>
        <Show
          when={p.participants ? state.canParticipate() : state.canRead()}
          fallback={<p role="alert">Keine Berechtigung für diesen Bereich.</p>}
        >
          <form onSubmit={state.filtersSubmit} role="search" class="flex flex-wrap items-center gap-2">
            <Input
              type="search"
              aria-label="Suche"
              maxLength={100}
              value={state.draftQuery()}
              onInput={(event) => state.queryChange(event.currentTarget.value)}
              placeholder={p.participants ? "Teilnehmername, E-Mail, Ticketart" : "Bestellnummer, Käufername, E-Mail"}
              class="max-w-md"
            />
            <Show when={!p.participants}>
              <SelectSingle
                valueSignal={state.statusSignal}
                getOptions={state.statusOptions}
                buttonProps={{ "aria-label": "Bestellstatus" }}
                texts={{ selectEntry: "Alle Status", noEntries: "Keine Status" }}
              />
            </Show>
            <Button type="submit" variant="outline">
              Suchen / Filtern
            </Button>
          </form>
          <p class="text-xs text-content-muted">
            Suche und Status filtern jeweils ein begrenztes Backend-Fenster (25 Einträge). Auch bei leerer Seite kann es
            weitere Treffer geben.
          </p>
          <Show when={state.loading()}>
            <p role="status">Lädt …</p>
          </Show>
          <Show when={state.error()}>
            <p role="alert">{state.error()}</p>
          </Show>
          <Show when={!state.loading() && !state.error()}>
            <Show when={!p.participants}>
              <ul class="flex flex-col gap-2">
                <For each={state.orders()} fallback={<li>Keine Bestellungen in diesem Fenster.</li>}>
                  {(order) => (
                    <li class="rounded-md border border-input p-3">
                      <Button variant="ghost" onClick={() => state.openOrder(order.orderId)}>
                        Bestellung {order.bookingNumber ?? "ohne Nummer"}
                      </Button>
                      <p>
                        {order.eventTitle} · {order.status} / {order.paymentStatus}
                      </p>
                      <nav aria-label="Veranstaltungslisten" class="flex flex-wrap gap-4 text-sm">
                        <Link
                          to="/veranstalter/events/$eventKey/bestellungen"
                          params={{ eventKey: order.eventKey }}
                          search={{ org: state.shell.activeOrganization()?.id }}
                          class="underline"
                        >
                          Bestellungen dieses Events
                        </Link>
                        <Show when={state.canParticipate()}>
                          <Link
                            to="/veranstalter/events/$eventKey/teilnehmer"
                            params={{ eventKey: order.eventKey }}
                            search={{ org: state.shell.activeOrganization()?.id }}
                            class="underline"
                          >
                            Teilnehmer dieses Events
                          </Link>
                        </Show>
                      </nav>
                      <p>
                        {order.buyer.givenName} {order.buyer.familyName} · {order.buyer.email}
                      </p>
                      <p class="text-sm">
                        {veranstalterDashboardOrdersMoneyFormat(order.totalCents)} ·{" "}
                        {veranstalterDashboardOrdersTimeFormat(order.createdAt)}
                      </p>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
            <Show when={p.participants}>
              <ul class="flex flex-col gap-2">
                <For each={state.participants()} fallback={<li>Keine Teilnehmer in diesem Fenster.</li>}>
                  {(ticket) => (
                    <li class="rounded-md border border-input p-3">
                      <p class="font-medium">{ticket.participantName || "Ohne Teilnehmername"}</p>
                      <p>
                        {ticket.participantEmail} · {ticket.tierName} · Nr. {ticket.sequence}
                      </p>
                      <p class="text-sm">
                        {ticket.cancelled
                          ? "Ticket gesperrt"
                          : ticket.checkedInAt
                            ? `Eingecheckt: ${veranstalterDashboardOrdersTimeFormat(ticket.checkedInAt)}`
                            : "Nicht eingecheckt"}
                      </p>
                    </li>
                  )}
                </For>
              </ul>
              <p class="text-xs text-content-muted">
                Nur Teilnehmerdaten und kanonischer Einlassstatus. Keine Bestell-/Käuferdaten. Check-in erfolgt
                weiterhin über den bestehenden Scanner.
              </p>
            </Show>
            <nav aria-label="Seitennavigation" class="flex gap-2">
              <Show when={state.hasCursor()}>
                <Button variant="outline" onClick={state.first}>
                  Erstes Fenster
                </Button>
              </Show>
              <Show when={state.hasNext()}>
                <Button variant="outline" onClick={state.next}>
                  Nächstes Fenster
                </Button>
              </Show>
            </nav>
          </Show>
        </Show>
      </section>
      <Sheet
        open={state.sheetOpen()}
        onOpenChange={(open) => {
          if (!open) state.sheetClose()
        }}
        title="Bestelldetails"
        size="xl"
      >
        <Show when={state.detailError()}>
          <p role="alert">{state.detailError()}</p>
        </Show>
        <Show when={state.detail()} fallback={<p role="status">Bestellung wird geladen …</p>}>
          <VeranstalterDashboardOrderDetail state={state} />
        </Show>
      </Sheet>
    </VeranstalterDashboardPageFrame>
  )
}
