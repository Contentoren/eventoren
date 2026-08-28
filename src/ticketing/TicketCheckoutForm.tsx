import { Show } from "solid-js"
import type { EventItem } from "../events/EventItem.ts"
import { UiButton } from "../ui/UiButton.tsx"
import { UiCard } from "../ui/UiCard.tsx"
import { UiStepper } from "../ui/UiStepper.tsx"
import type { TicketCart } from "./TicketCart.ts"
import { TicketCartSummary } from "./TicketCartSummary.tsx"
import type { TicketOrder } from "./TicketOrder.ts"
import { TicketPaymentMethodSelector } from "./TicketPaymentMethodSelector.tsx"
import { TicketWalletPass } from "./TicketWalletPass.tsx"
import { ticketCheckoutFormStateCreate } from "./ticketCheckoutFormStateCreate.ts"

export function TicketCheckoutForm(props: {
  event: EventItem
  cart: TicketCart
  onOrderComplete?: (order: TicketOrder) => void
}) {
  const state = ticketCheckoutFormStateCreate({
    event: () => props.event,
    cart: () => props.cart,
    onOrderComplete: (order) => props.onOrderComplete?.(order),
  })

  return (
    <div class="flex flex-col gap-space-6">
      <UiStepper labels={state.stepLabels()} currentIndex={state.stepIndex()} />

      <Show when={state.errorMessage()}>
        <p
          role="alert"
          class="rounded-control border border-danger/50 bg-danger-soft px-space-4 py-space-3 text-sm font-medium text-danger"
        >
          {state.errorMessage()}
        </p>
      </Show>

      <Show when={state.step() === "kontakt"}>
        <div class="grid gap-space-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <UiCard>
            <form
              class="flex flex-col gap-space-4"
              aria-labelledby="checkout-contact"
              onSubmit={(event) => {
                event.preventDefault()
                state.goToPayment()
              }}
            >
              <h2 id="checkout-contact" class="text-lg font-semibold text-content">
                Kontaktdaten (Gast-Checkout)
              </h2>
              <p class="text-sm text-content-muted">Kein Konto nötig – deine Tickets kommen sofort digital.</p>

              <div class="grid gap-space-4 sm:grid-cols-2">
                <div>
                  <label for="checkout-first-name" class="mb-space-2 block text-sm font-medium text-content">
                    Vorname
                  </label>
                  <input
                    id="checkout-first-name"
                    name="given-name"
                    autocomplete="given-name"
                    required
                    value={state.contact().firstName}
                    onInput={(event) => state.contactFieldChange("firstName", event.currentTarget.value)}
                    class="focus-ring h-11 w-full rounded-control border border-border-strong bg-surface-muted px-space-4 text-sm text-content"
                  />
                </div>
                <div>
                  <label for="checkout-last-name" class="mb-space-2 block text-sm font-medium text-content">
                    Nachname
                  </label>
                  <input
                    id="checkout-last-name"
                    name="family-name"
                    autocomplete="family-name"
                    required
                    value={state.contact().lastName}
                    onInput={(event) => state.contactFieldChange("lastName", event.currentTarget.value)}
                    class="focus-ring h-11 w-full rounded-control border border-border-strong bg-surface-muted px-space-4 text-sm text-content"
                  />
                </div>
              </div>

              <div>
                <label for="checkout-email" class="mb-space-2 block text-sm font-medium text-content">
                  E-Mail
                </label>
                <input
                  id="checkout-email"
                  type="email"
                  autocomplete="email"
                  required
                  aria-describedby="checkout-email-hint"
                  value={state.contact().email}
                  onInput={(event) => state.contactFieldChange("email", event.currentTarget.value)}
                  class="focus-ring h-11 w-full rounded-control border border-border-strong bg-surface-muted px-space-4 text-sm text-content"
                />
                <p id="checkout-email-hint" class="mt-space-2 text-sm text-content-muted">
                  An diese Adresse senden wir deine Ticketbestätigung.
                </p>
              </div>

              <div>
                <label for="checkout-phone" class="mb-space-2 block text-sm font-medium text-content">
                  Telefon (optional)
                </label>
                <input
                  id="checkout-phone"
                  type="tel"
                  autocomplete="tel"
                  value={state.contact().phone}
                  onInput={(event) => state.contactFieldChange("phone", event.currentTarget.value)}
                  class="focus-ring h-11 w-full rounded-control border border-border-strong bg-surface-muted px-space-4 text-sm text-content"
                />
              </div>

              <UiButton type="submit" size="lg" block disabled={state.isCartEmpty()}>
                Weiter zur Zahlung
              </UiButton>
            </form>
          </UiCard>

          <TicketCartSummary event={props.event} cart={props.cart} />
        </div>
      </Show>

      <Show when={state.step() === "zahlung"}>
        <div class="grid gap-space-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <UiCard>
            <section class="flex flex-col gap-space-4" aria-labelledby="checkout-payment">
              <h2 id="checkout-payment" class="text-lg font-semibold text-content">
                Zahlung
              </h2>
              <p class="text-sm text-content-muted">
                Demo-Zahlung: Es werden keine echten Zahlungsdaten erhoben oder abgebucht.
              </p>

              <TicketPaymentMethodSelector
                options={state.paymentMethodOptions()}
                selected={state.paymentMethod()}
                onSelect={(method) => state.paymentMethodSelect(method)}
              />

              <dl class="flex flex-col gap-space-3 border-t border-border-subtle pt-space-4">
                <div class="flex items-baseline justify-between gap-space-4">
                  <dt class="text-sm text-content-muted">Zahlungsart</dt>
                  <dd class="text-sm font-medium text-content">{state.selectedPaymentMethodOption().name}</dd>
                </div>
                <div class="flex items-baseline justify-between gap-space-4">
                  <dt class="text-sm text-content-muted">Empfänger</dt>
                  <dd class="text-sm font-medium text-content">
                    {state.contact().firstName} {state.contact().lastName}
                  </dd>
                </div>
                <div class="flex items-baseline justify-between gap-space-4">
                  <dt class="text-base font-semibold text-content">Zu zahlen</dt>
                  <dd class="text-base font-semibold text-content">{state.totalLabel()}</dd>
                </div>
              </dl>

              <div class="flex flex-col gap-space-3 sm:flex-row">
                <UiButton variant="secondary" size="lg" onClick={() => state.goToContact()}>
                  Zurück
                </UiButton>
                <UiButton size="lg" block disabled={state.isSubmitting()} onClick={() => state.confirmPayment()}>
                  {state.confirmLabel()}
                </UiButton>
              </div>
            </section>
          </UiCard>

          <TicketCartSummary event={props.event} cart={props.cart} />
        </div>
      </Show>

      <Show when={state.order()}>
        {(order) => (
          <div class="flex flex-col gap-space-6">
            <UiCard>
              <section aria-labelledby="checkout-done" class="flex flex-col gap-space-3">
                <h2 id="checkout-done" class="text-lg font-semibold text-content">
                  Buchung bestätigt
                </h2>
                <p class="text-sm text-content-muted" aria-live="polite">
                  Deine Tickets sind sofort verfügbar. Du findest sie jederzeit unter „Meine Tickets“ – auch offline.
                </p>
              </section>
            </UiCard>

            <TicketWalletPass order={order()} />
          </div>
        )}
      </Show>
    </div>
  )
}
