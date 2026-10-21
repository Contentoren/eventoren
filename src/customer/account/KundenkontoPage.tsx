import { For, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { kundenkontoPageStateCreate } from "./kundenkontoPageStateCreate.ts"
import { veranstalterDashboardOrdersMoneyFormat } from "#src/organizer/dashboard/pages/orders/veranstalterDashboardOrdersMoneyFormat.ts"
import { veranstalterDashboardOrdersTimeFormat } from "#src/organizer/dashboard/pages/orders/veranstalterDashboardOrdersTimeFormat.ts"
import type { KundenkontoSearch } from "./kundenkontoSearchParse.ts"

/** Customer account: tickets, orders with invoice, profile. German only. */
export function KundenkontoPage(p: {
  search: () => KundenkontoSearch
  changeSearch: (search: KundenkontoSearch) => void
}) {
  const state = kundenkontoPageStateCreate(p)
  return (
    <main class="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <h1 class="text-2xl font-semibold">Mein Konto</h1>
      <nav aria-label="Kontobereiche" class="flex gap-2">
        <Button
          type="button"
          variant={state.tab() === "tickets" ? "filled" : "outline"}
          onClick={() => state.selectTab("tickets")}
        >
          Tickets
        </Button>
        <Button
          type="button"
          variant={state.tab() === "bestellungen" ? "filled" : "outline"}
          onClick={() => state.selectTab("bestellungen")}
        >
          Bestellungen
        </Button>
        <Button
          type="button"
          variant={state.tab() === "profil" ? "filled" : "outline"}
          onClick={() => state.selectTab("profil")}
        >
          Profil
        </Button>
      </nav>
      <Show when={state.tab() === "tickets"}>
        <ul class="flex flex-col gap-2">
          <For each={state.tickets()} fallback={<li class="text-sm text-content-muted">Keine Tickets.</li>}>
            {(ticket) => (
              <li class="rounded-card border border-border-subtle bg-surface p-4 text-sm">
                <p class="font-medium">{ticket.eventTitle}</p>
                <p class="text-content-muted">
                  {veranstalterDashboardOrdersTimeFormat(ticket.eventStartsAt)} · {ticket.venue}, {ticket.city}
                </p>
                <p>
                  {ticket.tierName} · Code {ticket.code}
                  <Show when={ticket.checkedInAt !== null}>
                    <span class="text-content-muted"> · Eingecheckt</span>
                  </Show>
                  <Show when={ticket.cancelled}>
                    <span class="text-content-muted"> · Storniert</span>
                  </Show>
                </p>
              </li>
            )}
          </For>
        </ul>
      </Show>
      <Show when={state.tab() === "bestellungen"}>
        <Show
          when={state.detail()}
          fallback={
            <ul class="flex flex-col gap-2">
              <For each={state.orders()} fallback={<li class="text-sm text-content-muted">Keine Bestellungen.</li>}>
                {(order) => (
                  <li class="rounded-card border border-border-subtle bg-surface p-4 text-sm">
                    <Button type="button" variant="ghost" onClick={() => state.openOrder(order.id)}>
                      {order.eventTitle}
                    </Button>
                    <p class="text-content-muted tabular-nums">
                      {veranstalterDashboardOrdersMoneyFormat(order.totalCents)} ·{" "}
                      {order.status === "paid" ? "Bezahlt" : "Offen"}
                    </p>
                  </li>
                )}
              </For>
            </ul>
          }
        >
          {(data) => (
            <article class="flex flex-col gap-3 rounded-card border border-border-subtle bg-surface p-4 text-sm">
              <h2 class="text-lg font-semibold">{data().order.eventTitle}</h2>
              <ul class="flex flex-col gap-1">
                <For each={data().tickets}>
                  {(ticket) => (
                    <li>
                      {ticket.tierName} · {ticket.code}
                    </li>
                  )}
                </For>
              </ul>
              <Show
                when={data().invoice}
                fallback={<p class="text-content-muted">Rechnung erst nach Zahlung verfügbar.</p>}
              >
                {(invoice) => (
                  <section aria-label="Rechnung" class="flex flex-col gap-1 border-t border-border-subtle pt-3">
                    <p class="font-medium">Rechnung {invoice().invoiceNumber}</p>
                    <p class="text-content-muted">
                      {invoice().buyerName} · {invoice().buyerEmail}
                    </p>
                    <For each={invoice().lines}>
                      {(line) => (
                        <p class="tabular-nums">
                          {line.quantity}× {line.name} · {veranstalterDashboardOrdersMoneyFormat(line.unitPriceCents)}
                        </p>
                      )}
                    </For>
                    <p class="tabular-nums">Summe: {veranstalterDashboardOrdersMoneyFormat(invoice().totalCents)}</p>
                  </section>
                )}
              </Show>
            </article>
          )}
        </Show>
      </Show>
      <Show when={state.tab() === "profil"}>
        <Show when={state.profile()}>
          {(profile) => (
            <form onSubmit={state.saveProfile} class="flex flex-col gap-2">
              <p class="text-sm text-content-muted">E-Mail (fest): {profile().email ?? "—"}</p>
              <label class="flex flex-col gap-1 text-sm">
                Name
                <Input
                  value={state.name.get() || profile().name}
                  onInput={(event) => state.name.set(event.currentTarget.value)}
                  maxLength={120}
                  required
                />
              </label>
              <Button type="submit" variant="filled" disabled={state.busy()}>
                Speichern
              </Button>
              <Show when={state.message()}>
                <p aria-live="polite" class="text-sm">
                  {state.message()}
                </p>
              </Show>
            </form>
          )}
        </Show>
      </Show>
    </main>
  )
}
