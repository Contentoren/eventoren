import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import type { EventItem } from "../events/EventItem.ts"
import { UiBadge } from "../ui/UiBadge.tsx"
import { UiCard } from "../ui/UiCard.tsx"
import type { TicketCart } from "./TicketCart.ts"
import { ticketTierSelectorStateCreate } from "./ticketTierSelectorStateCreate.ts"

export function TicketTierSelector(props: {
  event: EventItem
  cart: TicketCart
  onCartChange: (cart: TicketCart) => void
}) {
  const state = ticketTierSelectorStateCreate({
    event: () => props.event,
    cart: () => props.cart,
    onCartChange: (cart) => props.onCartChange(cart),
  })

  return (
    <section class="flex flex-col gap-space-4" aria-labelledby="ticket-tier-selector">
      <h2 id="ticket-tier-selector" class="text-xl font-semibold text-content">
        Tickets auswählen
      </h2>

      <ul class="flex flex-col gap-space-4">
        <For each={state.rows()}>
          {(row) => (
            <li>
              <UiCard padded={false} class="border-0 shadow-sm p-5">
                <div class="flex flex-col gap-space-4 sm:flex-row sm:items-start sm:justify-between">
                  <div class="flex flex-col gap-space-2">
                    <p class="text-base font-semibold text-content">{row.name}</p>
                    <p class="text-sm text-content-muted">{row.description}</p>
                    <Show when={row.soldOut}>
                      <UiBadge tone="danger">Ausverkauft</UiBadge>
                    </Show>
                  </div>

                  <div class="flex flex-col items-start gap-space-3 sm:items-end">
                    <div class="sm:text-right">
                      <p class="text-lg font-semibold text-content">{row.priceLabel}</p>
                      <p class="text-sm text-content-muted">{row.totalLabel}</p>
                    </div>

                    <div class="flex flex-col items-start gap-space-2 sm:items-end">
                      <div class="flex flex-wrap items-center gap-space-3">
                        <Show when={row.activationCodeRequired}>
                          <Label for={row.activationCodeFieldId} class="sr-only">
                            Freischaltungscode für {row.name}
                          </Label>
                          <Input
                            id={row.activationCodeFieldId}
                            value={row.activationCodeValue}
                            onInput={(event) => state.activationCodeChange(row.id, event.currentTarget.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault()
                                state.activationCodeValidate(row.id)
                              }
                            }}
                            maxlength={8}
                            autocomplete="off"
                            autocapitalize="characters"
                            spellcheck={false}
                            placeholder="Code"
                            aria-describedby={`${row.activationCodeFieldId}-status`}
                            aria-invalid={row.activationCodeStatus === "invalid" ? "true" : undefined}
                            class="h-10 w-28 text-center font-mono uppercase tracking-widest sm:w-32"
                            classList={{
                              "!border-danger/50 !bg-danger-soft": row.activationCodeStatus === "invalid",
                            }}
                          />
                        </Show>
                        <Button
                          variant="none"
                          size="none"
                          type="button"
                          onClick={() => state.decreaseTier(row.id)}
                          disabled={!row.canDecrease}
                          aria-label={`Ein Ticket weniger für ${row.name}`}
                          class="focus-ring flex size-10 items-center justify-center rounded-control bg-surface-muted text-lg font-semibold text-content ring-1 ring-inset ring-border-subtle transition-colors hover:text-content hover:ring-brand-accent disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          −
                        </Button>
                        <output
                          aria-live="polite"
                          aria-label={`${row.quantity} Tickets für ${row.name}`}
                          class="w-8 text-center text-base font-semibold text-content"
                        >
                          {row.quantity}
                        </output>
                        <Button
                          variant="none"
                          size="none"
                          type="button"
                          onClick={() => state.increaseTier(row.id)}
                          disabled={!row.canIncrease}
                          aria-label={`Ein Ticket mehr für ${row.name}`}
                          title={
                            row.activationCodeRequired && row.activationCodeStatus !== "valid"
                              ? "Bitte zuerst den Freischaltungscode prüfen"
                              : undefined
                          }
                          class="focus-ring flex size-10 items-center justify-center rounded-control bg-brand text-lg font-semibold text-brand-content transition-colors hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          +
                        </Button>
                      </div>
                      <Show when={row.activationCodeRequired}>
                        <p
                          id={`${row.activationCodeFieldId}-status`}
                          role="status"
                          aria-live="polite"
                          class="text-xs sm:text-right"
                          classList={{
                            "text-success": row.activationCodeStatus === "valid",
                            "text-danger": row.activationCodeStatus === "invalid",
                            "text-content-muted":
                              row.activationCodeStatus === "idle" || row.activationCodeStatus === "checking",
                          }}
                        >
                          {row.activationCodeMessage}
                        </p>
                        <Show when={row.activationCodeStatus === "invalid"}>
                          <Button
                            variant="none"
                            size="none"
                            type="button"
                            onClick={() => state.activationCodeValidate(row.id)}
                            class="focus-ring rounded text-xs font-medium text-brand-accent transition-colors hover:underline hover:text-content"
                          >
                            Erneut prüfen
                          </Button>
                        </Show>
                      </Show>
                    </div>
                  </div>
                </div>
              </UiCard>
            </li>
          )}
        </For>
      </ul>

      <p class="text-sm text-content-muted">{state.hintLabel()}</p>
      <p class="sr-only" aria-live="polite">
        {state.selectionLabel()}
      </p>
    </section>
  )
}
