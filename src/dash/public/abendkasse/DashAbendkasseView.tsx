import { mdiApple } from "@adaptive-ds/mdi/mdiApple.js"
import { mdiCashRegister } from "@adaptive-ds/mdi/mdiCashRegister.js"
import { mdiCheckCircle } from "@adaptive-ds/mdi/mdiCheckCircle.js"
import { mdiCreditCardOutline } from "@adaptive-ds/mdi/mdiCreditCardOutline.js"
import { mdiGoogle } from "@adaptive-ds/mdi/mdiGoogle.js"
import { mdiMinus } from "@adaptive-ds/mdi/mdiMinus.js"
import { mdiPlus } from "@adaptive-ds/mdi/mdiPlus.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { For, Show } from "solid-js"
import { TicketQrCode } from "../../../ticketing/TicketQrCode.tsx"
import { dashCentsFormat } from "../../model/dashCentsFormat.ts"
import { DashOrgLogo } from "../../ui/org/DashOrgLogo.tsx"
import type { DashAbendkasseState } from "./dashAbendkasseStateCreate.ts"

/** Gast-Kaufseite der Abendkasse: helle mobile Checkout-Ansicht mit Ticket-Erfolg. */
export function DashAbendkasseView(p: { state: DashAbendkasseState; eventId: string }) {
  const state = p.state
  return (
    <div class="min-h-dvh bg-stone-50 text-slate-900">
      <div class="mx-auto w-full max-w-md px-4 py-6 sm:py-8">
        <Show when={state.phase() !== "fertig"}>
          {(buying) => (
            <div class="flex flex-col gap-5">
              <header class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <Show when={state.event()?.imageUrl}>
                  {(src) => <img src={src()} alt="" class="h-36 w-full object-cover" loading="lazy" />}
                </Show>
                <div class="flex items-center gap-3 p-4">
                  <Show when={state.org()}>
                    {(org) => <DashOrgLogo name={org().name} logoDataUrl={org().logoDataUrl} size="md" />}
                  </Show>
                  <div class="min-w-0">
                    <h1 class="truncate text-lg font-semibold">{state.event()?.title ?? "Abendkasse"}</h1>
                    <p class="truncate text-sm text-slate-500">{state.dateLabel()}</p>
                    <Show when={state.org()}>
                      {(org) => <p class="truncate text-sm font-medium text-slate-700">{org().name}</p>}
                    </Show>
                  </div>
                </div>
              </header>

              <Show
                when={state.event() && state.boxOfficeOn() && (state.sale() || state.tiles().length > 0)}
                fallback={
                  <div class="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                    <Icon path={mdiCashRegister} class="mx-auto size-12 text-slate-300" />
                    <h2 class="mt-3 text-lg font-semibold">Abendkasse ist pausiert</h2>
                    <p class="mt-1 text-sm text-slate-500">
                      Frag einfach an der Kasse nach – dort hilft dir das Team weiter.
                    </p>
                    <LinkButtonInternal to="/demo" variant="outline" class="mt-4 h-11 px-5">
                      Zur Übersicht
                    </LinkButtonInternal>
                  </div>
                }
              >
                <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Deine Tickets">
                  <h2 class="text-base font-semibold">Deine Tickets</h2>
                  <Show
                    when={state.sale()}
                    fallback={
                      <div class="mt-3 flex flex-col gap-3">
                        <For each={state.tiles()}>
                          {(tile) => (
                            <article class="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
                              <div class="min-w-0 flex-1">
                                <h3 class="truncate text-sm font-semibold">{tile.type.name}</h3>
                                <p class="text-sm tabular-nums text-slate-600">
                                  {dashCentsFormat(tile.unitPriceCents)}
                                </p>
                                <p class="text-xs text-slate-400">
                                  <Show when={!tile.soldOut} fallback="Ausverkauft">
                                    Noch {tile.available} verfügbar
                                  </Show>
                                </p>
                              </div>
                              <div class="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  class="size-11"
                                  disabled={tile.soldOut || state.tileQuantity(tile.type.id) === 0}
                                  onClick={() => state.decrease(tile.type.id)}
                                  aria-label={`${tile.type.name} entfernen`}
                                >
                                  <Icon path={mdiMinus} class="size-5" />
                                </Button>
                                <span class="min-w-8 text-center text-lg font-bold tabular-nums" aria-live="polite">
                                  {state.tileQuantity(tile.type.id)}
                                </span>
                                <Button
                                  variant="contrast"
                                  class="size-11"
                                  disabled={tile.soldOut}
                                  onClick={() => state.increase(tile.type.id)}
                                  aria-label={`${tile.type.name} hinzufügen`}
                                >
                                  <Icon path={mdiPlus} class="size-5" />
                                </Button>
                              </div>
                            </article>
                          )}
                        </For>
                      </div>
                    }
                  >
                    <ul class="mt-3 flex flex-col gap-2">
                      <For each={state.saleLines()}>
                        {(line) => (
                          <li class="flex items-baseline justify-between gap-3 text-sm">
                            <span class="min-w-0 flex-1">
                              {line.quantity} × {line.name}
                            </span>
                            <span class="tabular-nums text-slate-600">
                              {dashCentsFormat(line.unitPriceCents * line.quantity)}
                            </span>
                          </li>
                        )}
                      </For>
                    </ul>
                    <p class="mt-2 text-xs text-slate-400">Von der Kasse vorbereitet – du musst nur noch bezahlen.</p>
                  </Show>
                  <div class="mt-4 flex items-baseline justify-between border-t border-slate-100 pt-3">
                    <span class="text-sm font-medium text-slate-500">Gesamt</span>
                    <span class="text-2xl font-bold tabular-nums">{state.totalLabel()}</span>
                  </div>
                </section>

                <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Deine Daten">
                  <h2 class="text-base font-semibold">Deine Daten</h2>
                  <p class="mt-1 text-sm text-slate-500">Ticket und Beleg senden wir an deine E-Mail.</p>
                  <div class="mt-3 flex flex-col gap-3">
                    <label class="flex flex-col gap-1 text-sm font-medium">
                      Name*
                      <Input
                        value={state.buyerName.get()}
                        onInput={(event) => state.setName(event.currentTarget.value)}
                        placeholder="Vor- und Nachname"
                        autocomplete="name"
                        class="h-12 text-base"
                      />
                    </label>
                    <label class="flex flex-col gap-1 text-sm font-medium">
                      E-Mail*
                      <Input
                        value={state.buyerEmail.get()}
                        onInput={(event) => state.setEmail(event.currentTarget.value)}
                        placeholder="name@beispiel.de"
                        inputmode="email"
                        autocomplete="email"
                        class="h-12 text-base"
                      />
                    </label>
                  </div>
                </section>

                <Show when={state.error.get()}>
                  {(message) => (
                    <p role="alert" class="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      {message()}
                    </p>
                  )}
                </Show>

                <section class="flex flex-col gap-2.5" aria-label="Bezahlen">
                  <Button
                    variant="contrast"
                    class="h-14 gap-2 bg-black text-lg text-white hover:bg-slate-800"
                    disabled={state.busy.get()}
                    onClick={() => state.pay("applepay")}
                  >
                    <Icon path={mdiApple} class="size-6" />
                    {state.busy.get() ? "Wird verarbeitet …" : "Pay"}
                  </Button>
                  <Button
                    variant="outline"
                    class="h-14 gap-2 border-slate-300 bg-white text-lg"
                    disabled={state.busy.get()}
                    onClick={() => state.pay("googlepay")}
                  >
                    <Icon path={mdiGoogle} class="size-6" />
                    {state.busy.get() ? "Wird verarbeitet …" : "G Pay"}
                  </Button>
                  <Button
                    variant="outline"
                    class="h-14 gap-2 border-slate-300 bg-white text-lg"
                    disabled={state.busy.get()}
                    onClick={() => state.pay("karte")}
                  >
                    <Icon path={mdiCreditCardOutline} class="size-6" />
                    {state.busy.get() ? "Wird verarbeitet …" : "Karte"}
                  </Button>
                  <Show when={state.busy.get()}>
                    <p role="status" class="flex items-center justify-center gap-2 text-sm text-slate-500">
                      <span
                        class="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700"
                        aria-hidden="true"
                      />
                      Zahlung läuft – bitte kurz warten …
                    </p>
                  </Show>
                  <p class="text-center text-xs text-slate-400">Nur bargeldlos · Zahlung am eigenen Handy</p>
                </section>
              </Show>
            </div>
          )}
        </Show>
        <Show when={state.paidTickets()}>
          {(paid) => (
            <div class="flex flex-col gap-4" aria-live="polite">
              <div class="rounded-3xl bg-emerald-600 p-6 text-center text-white shadow-sm">
                <Icon path={mdiCheckCircle} class="mx-auto size-14" />
                <h1 class="mt-2 text-2xl font-bold">Du bist eingecheckt</h1>
                <p class="mt-1 text-white/85">Ticket per E-Mail gesendet · Zeig den QR am Einlass</p>
              </div>
              <For each={paid()}>
                {(ticket) => (
                  <article class="rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                    <h2 class="text-base font-semibold">{state.event()?.title ?? "Ticket"}</h2>
                    <p class="text-sm text-slate-500">{state.dateLabel()}</p>
                    <div class="mt-3 flex justify-center">
                      <TicketQrCode value={ticket.code} label={`Ticket ${ticket.code}`} />
                    </div>
                    <p class="mt-2 font-mono text-sm tracking-widest text-slate-600">{ticket.code}</p>
                  </article>
                )}
              </For>
              <p class="text-center text-sm tabular-nums text-slate-500">
                {paid().length} {paid().length === 1 ? "Ticket" : "Tickets"} · {state.totalLabel()}
              </p>
            </div>
          )}
        </Show>
      </div>
    </div>
  )
}
