import { For, Show } from "solid-js"
import type { EventItem } from "../events/EventItem.ts"
import { UiButton } from "../ui/UiButton.tsx"
import { UiCard } from "../ui/UiCard.tsx"
import { UiStepper } from "../ui/UiStepper.tsx"
import type { TicketCart } from "./TicketCart.ts"
import { TicketCartSummary } from "./TicketCartSummary.tsx"
import { ticketCheckoutFormStateCreate } from "./ticketCheckoutFormStateCreate.ts"

export function TicketCheckoutForm(props: {
  items: readonly { readonly event: EventItem; readonly cart: TicketCart }[]
}) {
  const state = ticketCheckoutFormStateCreate({
    items: () => props.items,
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

          <div class="flex flex-col gap-space-4">
            <For each={props.items}>{(item) => <TicketCartSummary event={item.event} cart={item.cart} />}</For>
          </div>
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
                Du wirst für die sichere Zahlung zum Zahlungsanbieter weitergeleitet. Der verbindliche Zahlungsstatus
                kommt anschließend vom Server zurück.
              </p>

              <dl class="flex flex-col gap-space-3 border-t border-border-subtle pt-space-4">
                <div class="flex items-baseline justify-between gap-space-4">
                  <dt class="text-sm text-content-muted">Ticketinhaber:in</dt>
                  <dd class="text-sm font-medium text-content">
                    {state.contact().firstName} {state.contact().lastName}
                  </dd>
                </div>
                <div class="flex items-baseline justify-between gap-space-4">
                  <dt class="text-base font-semibold text-content">Zu zahlen</dt>
                  <dd class="text-base font-semibold text-content">{state.totalLabel()}</dd>
                </div>
              </dl>

              <label class="flex items-start gap-space-3 text-sm text-content-muted">
                <input
                  type="checkbox"
                  checked={state.legalAccepted()}
                  onChange={(event) => state.legalAcceptanceChange(event.currentTarget.checked)}
                  class="mt-1 size-4 accent-brand"
                />
                <span>
                  Ich akzeptiere die{" "}
                  <a href="/agb" class="underline underline-offset-4">
                    AGB
                  </a>{" "}
                  und habe die
                  <a href="/datenschutz" class="ml-1 underline underline-offset-4">
                    Datenschutzhinweise
                  </a>{" "}
                  gelesen.
                </span>
              </label>

              <div class="flex flex-col gap-space-3 sm:flex-row">
                <UiButton variant="secondary" size="lg" onClick={() => state.goToContact()}>
                  Zurück
                </UiButton>
                <UiButton
                  size="lg"
                  block
                  disabled={state.isSubmitting() || !state.legalAccepted()}
                  onClick={() => state.confirmPayment()}
                >
                  {state.isSubmitting() ? "Checkout wird erstellt …" : "Weiter zur sicheren Zahlung"}
                </UiButton>
              </div>
            </section>
          </UiCard>

          <div class="flex flex-col gap-space-4">
            <For each={props.items}>{(item) => <TicketCartSummary event={item.event} cart={item.cart} />}</For>
          </div>
        </div>
      </Show>
    </div>
  )
}
