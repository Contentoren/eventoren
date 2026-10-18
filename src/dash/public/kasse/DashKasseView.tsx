import { mdiCashRegister } from "@adaptive-ds/mdi/mdiCashRegister.js"
import { mdiCheckCircle } from "@adaptive-ds/mdi/mdiCheckCircle.js"
import { mdiClose } from "@adaptive-ds/mdi/mdiClose.js"
import { mdiMinus } from "@adaptive-ds/mdi/mdiMinus.js"
import { mdiOpenInNew } from "@adaptive-ds/mdi/mdiOpenInNew.js"
import { mdiPlus } from "@adaptive-ds/mdi/mdiPlus.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { LinkButtonExternal, LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { For, Show } from "solid-js"
import { TicketQrCode } from "../../../ticketing/TicketQrCode.tsx"
import { dashCentsFormat } from "../../model/dashCentsFormat.ts"
import { dashKasseVorgangText } from "./dashKasseVorgangText.ts"
import type { DashKasseState } from "./dashKasseStateCreate.ts"

/** Kassenmodus: dunkle Vollbild-Ansicht mit Kacheln, QR-Zahlung und Erfolgsbildschirm. */
export function DashKasseView(p: { state: DashKasseState; eventId: string }) {
  const state = p.state
  return (
    <div class="min-h-dvh bg-slate-950 text-white">
      <Show
        when={state.phase() === "fertig" && state.sale()}
        fallback={
          <div class="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 py-4 sm:px-6">
            <header class="flex flex-wrap items-center gap-3 border-b border-white/10 pb-4">
              <div class="flex min-w-0 flex-1 items-center gap-3">
                <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
                  <Icon path={mdiCashRegister} class="size-6 text-emerald-300" />
                </span>
                <div class="min-w-0">
                  <h1 class="truncate text-lg font-semibold sm:text-xl">{state.event()?.title ?? "Abendkasse"}</h1>
                  <p class="text-sm text-white/60 tabular-nums" aria-live="off">
                    {state.timeLabel()} Uhr · Heute verkauft: {state.todayStats().count} · {state.todayStats().revenue}
                  </p>
                </div>
              </div>
              <LinkButtonInternal
                to="/demo/dashboard/events/$eventId/abendkasse"
                params={{ eventId: p.eventId }}
                variant="outline"
                class="h-11 border-white/20 px-4 text-white hover:bg-white/10"
              >
                Beenden
              </LinkButtonInternal>
            </header>

            <Show
              when={state.boxOfficeOn() && state.tiles().length > 0}
              fallback={
                <div class="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
                  <Icon path={mdiCashRegister} class="size-14 text-white/30" />
                  <div>
                    <h2 class="text-xl font-semibold">Abendkasse ist pausiert</h2>
                    <p class="mt-1 max-w-sm text-sm text-white/60">
                      Aktiviere die Abendkasse und lege Abendkassen-Tickets an, damit du hier verkaufen kannst.
                    </p>
                  </div>
                  <LinkButtonInternal
                    to="/demo/dashboard/events/$eventId/abendkasse"
                    params={{ eventId: p.eventId }}
                    variant="contrast"
                    class="h-12 px-6"
                  >
                    Zu den Einstellungen
                  </LinkButtonInternal>
                </div>
              }
            >
              <Show
                when={state.phase() === "zahlung" && state.sale()}
                fallback={
                  <main class="flex flex-1 flex-col gap-5 py-5">
                    <Show when={state.todayStats().open > 0}>
                      <p class="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70">
                        {dashKasseVorgangText(state.todayStats().open)}
                      </p>
                    </Show>
                    <div class="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <For each={state.tiles()}>
                        {(tile) => (
                          <article
                            class="flex min-h-44 cursor-pointer flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 transition-colors hover:border-emerald-400/50 hover:bg-white/10"
                            onClick={() => state.addOne(tile.type.id)}
                            aria-label={`${tile.type.name} wählen`}
                          >
                            <div>
                              <h2 class="text-lg font-semibold">{tile.type.name}</h2>
                              <p class="mt-1 text-2xl font-bold tabular-nums">{dashCentsFormat(tile.unitPriceCents)}</p>
                              <p class="mt-1 text-sm text-white/60">
                                <Show when={!tile.soldOut} fallback="Ausverkauft">
                                  Noch {tile.available} verfügbar
                                </Show>
                              </p>
                            </div>
                            <div
                              class="flex items-center justify-between gap-2"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <Button
                                variant="outline"
                                class="size-14 border-white/20 text-xl text-white hover:bg-white/10"
                                disabled={tile.soldOut || state.tileQuantity(tile.type.id) === 0}
                                onClick={() => state.decrease(tile.type.id)}
                                aria-label={`${tile.type.name} entfernen`}
                              >
                                <Icon path={mdiMinus} class="size-6" />
                              </Button>
                              <span class="min-w-10 text-center text-3xl font-bold tabular-nums" aria-live="polite">
                                {state.tileQuantity(tile.type.id)}
                              </span>
                              <Button
                                variant="contrast"
                                class="size-14 text-xl"
                                disabled={tile.soldOut}
                                onClick={() => state.increase(tile.type.id)}
                                aria-label={`${tile.type.name} hinzufügen`}
                              >
                                <Icon path={mdiPlus} class="size-6" />
                              </Button>
                            </div>
                          </article>
                        )}
                      </For>
                    </div>
                    <Show when={state.error.get()}>
                      {(message) => (
                        <p role="alert" class="rounded-xl bg-red-500/15 px-4 py-3 text-sm font-medium text-red-200">
                          {message()}
                        </p>
                      )}
                    </Show>
                    <footer class="sticky bottom-0 flex flex-col gap-3 border-t border-white/10 bg-slate-950/95 py-4 backdrop-blur sm:flex-row sm:items-center">
                      <p class="flex-1 text-3xl font-bold tabular-nums sm:text-4xl">
                        {dashCentsFormat(state.totalCents())}
                        <span class="ml-3 align-middle text-sm font-normal text-white/60">
                          {state.ticketCount()} {state.ticketCount() === 1 ? "Ticket" : "Tickets"}
                        </span>
                      </p>
                      <Button
                        variant="contrast"
                        class="h-14 gap-2 px-8 text-lg"
                        disabled={state.ticketCount() === 0}
                        onClick={state.createSale}
                      >
                        QR zum Bezahlen anzeigen
                      </Button>
                    </footer>
                  </main>
                }
              >
                {(sale) => (
                  <main class="flex flex-1 flex-col items-center gap-5 py-8 text-center">
                    <p class="text-sm text-white/60">
                      {sale().lines.reduce((sum, line) => sum + line.quantity, 0)}{" "}
                      {sale().lines.reduce((sum, line) => sum + line.quantity, 0) === 1 ? "Ticket" : "Tickets"} ·{" "}
                      {dashCentsFormat(sale().totalCents)}
                    </p>
                    <p class="text-5xl font-bold tabular-nums">{dashCentsFormat(sale().totalCents)}</p>
                    <div class="rounded-3xl bg-white p-5">
                      <TicketQrCode
                        value={state.saleUrl()}
                        label={`Abendkasse ${state.event()?.title ?? ""}`}
                        class="w-70"
                      />
                    </div>
                    <p class="text-sm break-all text-white/50">{state.saleUrl()}</p>
                    <p role="status" class="flex items-center gap-2 text-base font-medium text-amber-200">
                      <span
                        class="size-4 animate-spin rounded-full border-2 border-amber-200/40 border-t-amber-200"
                        aria-hidden="true"
                      />
                      Wartet auf Zahlung …
                    </p>
                    <div class="flex flex-wrap items-center justify-center gap-3">
                      <Button
                        variant="outline"
                        class="h-12 gap-2 border-white/20 px-5 text-white hover:bg-white/10"
                        onClick={state.cancelSale}
                      >
                        <Icon path={mdiClose} class="size-5" />
                        Abbrechen
                      </Button>
                      <LinkButtonExternal
                        href={state.saleUrl()}
                        newTab
                        variant="ghost"
                        class="h-12 gap-2 px-5 text-white/80 hover:bg-white/10 hover:text-white"
                        icon={mdiOpenInNew}
                      >
                        Gast-Ansicht öffnen
                      </LinkButtonExternal>
                    </div>
                  </main>
                )}
              </Show>
            </Show>
          </div>
        }
      >
        {(sale) => (
          <div
            class="flex min-h-dvh flex-col items-center justify-center gap-4 bg-emerald-600 px-6 py-16 text-center text-white"
            aria-live="assertive"
            role="status"
          >
            <Icon path={mdiCheckCircle} class="size-20" />
            <h1 class="text-3xl font-bold sm:text-4xl">Bezahlt ✓</h1>
            <p class="text-lg">
              {sale().lines.reduce((sum, line) => sum + line.quantity, 0)}{" "}
              {sale().lines.reduce((sum, line) => sum + line.quantity, 0) === 1 ? "Ticket" : "Tickets"} · eingecheckt
            </p>
            <p class="text-white/80">{dashCentsFormat(sale().totalCents)}</p>
          </div>
        )}
      </Show>
    </div>
  )
}
