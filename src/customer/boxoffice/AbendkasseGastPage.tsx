import { Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { abendkasseGastPageStateCreate } from "./abendkasseGastPageStateCreate.ts"
import { veranstalterDashboardOrdersMoneyFormat } from "#src/organizer/dashboard/pages/orders/veranstalterDashboardOrdersMoneyFormat.ts"
import { veranstalterDashboardOrdersTimeFormat } from "#src/organizer/dashboard/pages/orders/veranstalterDashboardOrdersTimeFormat.ts"

/** Mobile guest purchase page for one box-office sale. German only, touch-first. */
export function AbendkasseGastPage(p: { saleId: () => string }) {
  const state = abendkasseGastPageStateCreate(p)
  return (
    <main class="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      <Show
        when={(() => {
          const current = state.sale()
          return current?.success ? current.data : undefined
        })()}
        fallback={
          <p>
            {(() => {
              const current = state.sale()
              return current && !current.success ? current.errorMessage : "Vorgang wird geladen …"
            })()}
          </p>
        }
      >
        {(data) => (
          <>
            <h1 class="text-2xl font-semibold">{data().eventTitle}</h1>
            <p class="text-sm text-content-muted">
              {data().venue} · {data().city} · {veranstalterDashboardOrdersTimeFormat(data().startsAt)}
            </p>
            <div class="rounded-card border border-border-subtle bg-surface p-5">
              <p class="text-sm text-content-muted">
                {data().tierName} · {data().quantity}×
              </p>
              <p class="text-2xl font-semibold tabular-nums">
                {veranstalterDashboardOrdersMoneyFormat(data().totalCents)}
              </p>
              <p class="text-sm">
                Status:{" "}
                {data().status === "wartet" ? "Wartend" : data().status === "bezahlt" ? "Bezahlt" : "Abgebrochen"}
              </p>
            </div>
            <Show when={data().status === "wartet" && data().testHarness}>
              <div class="rounded-card border border-dashed border-border-subtle p-4">
                <p class="text-sm font-medium">TEST-Harness: simulierte Gerätezahlung</p>
                <p class="text-xs text-content-muted">
                  Nur für Vorführungen. Es fließt kein Geld, es entsteht keine Bestellung.
                </p>
                <Button
                  type="button"
                  variant="filled"
                  disabled={state.busy()}
                  onClick={state.testPay}
                  class="mt-2 min-h-11 w-full"
                >
                  TEST: Jetzt simuliert zahlen
                </Button>
              </div>
            </Show>
            <Show when={data().status === "wartet" && !data().testHarness}>
              <p class="text-sm">Bitte an der Kasse zahlen. Der Einlass checkt dich danach ein.</p>
            </Show>
            <Show when={data().status === "bezahlt"}>
              <p class="text-sm">Bezahlt — bitte zum Einlass gehen.</p>
            </Show>
            <Show when={state.message()}>
              <p aria-live="polite" class="text-sm">
                {state.message()}
              </p>
            </Show>
          </>
        )}
      </Show>
    </main>
  )
}
