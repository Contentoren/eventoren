import { For, Index, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import type { EventItem } from "../events/EventItem.ts"
import { UiButton } from "../ui/UiButton.tsx"
import { UiCard } from "../ui/UiCard.tsx"
import type { TicketCart } from "./TicketCart.ts"
import { TicketCartSummary } from "./TicketCartSummary.tsx"
import type { TicketCheckoutFormState } from "./TicketCheckoutFormState.ts"
import { ticketParticipantFieldKeyCreate } from "./ticketParticipantFieldKeyCreate.ts"
import { ticketCheckoutText } from "./ticketCheckoutText.ts"

export function TicketCheckoutForm(props: {
  items: readonly { readonly event: EventItem; readonly cart: TicketCart }[]
  state: TicketCheckoutFormState
  legalLinks?: { terms: string; privacy: string }
  submitLabel?: string
  relaxedValidation?: boolean
}) {
  const state = props.state
  const text = ticketCheckoutText
  const legalLinks = props.legalLinks ?? { terms: "/agb", privacy: "/datenschutz" }

  return (
    <div class="flex flex-col gap-space-6">
      <Show when={state.step() === "kontakt"}>
        <div class="grid gap-space-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <UiCard>
            <form
              class="flex flex-col gap-space-4"
              data-hydrated={state.hydrated() ? "true" : "false"}
              aria-labelledby="checkout-contact"
              noValidate
              onSubmit={(event) => {
                event.preventDefault()
                state.confirmPayment()
              }}
            >
              <h2 id="checkout-contact" class="text-lg font-semibold text-content">
                {text().contactTitle}
              </h2>
              <p class="text-sm text-content-muted">{text().contactDescription}</p>

              <div class="grid gap-space-4 sm:grid-cols-2">
                <div>
                  <label for="checkout-first-name" class="mb-space-2 block text-sm font-medium text-content">
                    {text().firstName}
                  </label>
                  <Input
                    id="checkout-first-name"
                    name="given-name"
                    autocomplete="given-name"
                    required={!props.relaxedValidation}
                    aria-invalid={state.isFieldInvalid("firstName") ? "true" : undefined}
                    value={state.contact().firstName}
                    onInput={(event) => state.contactFieldChange("firstName", event.currentTarget.value)}
                    class="focus-ring h-11 w-full rounded-control border px-space-4 text-sm"
                    classList={{
                      "border-border-strong bg-surface-muted text-content": !state.isFieldInvalid("firstName"),
                      "!border-danger/50 !bg-danger-soft text-content": state.isFieldInvalid("firstName"),
                    }}
                  />
                </div>
                <div>
                  <label for="checkout-last-name" class="mb-space-2 block text-sm font-medium text-content">
                    {text().lastName}
                  </label>
                  <Input
                    id="checkout-last-name"
                    name="family-name"
                    autocomplete="family-name"
                    required={!props.relaxedValidation}
                    aria-invalid={state.isFieldInvalid("lastName") ? "true" : undefined}
                    value={state.contact().lastName}
                    onInput={(event) => state.contactFieldChange("lastName", event.currentTarget.value)}
                    class="focus-ring h-11 w-full rounded-control border px-space-4 text-sm"
                    classList={{
                      "border-border-strong bg-surface-muted text-content": !state.isFieldInvalid("lastName"),
                      "!border-danger/50 !bg-danger-soft text-content": state.isFieldInvalid("lastName"),
                    }}
                  />
                </div>
              </div>

              <div>
                <label for="checkout-email" class="mb-space-2 block text-sm font-medium text-content">
                  {text().email}
                </label>
                <Input
                  id="checkout-email"
                  type={props.relaxedValidation ? "text" : "email"}
                  autocomplete="email"
                  required={!props.relaxedValidation}
                  aria-describedby="checkout-email-hint"
                  aria-invalid={state.isFieldInvalid("email") ? "true" : undefined}
                  value={state.contact().email}
                  onInput={(event) => state.contactFieldChange("email", event.currentTarget.value)}
                  class="focus-ring h-11 w-full rounded-control border px-space-4 text-sm"
                  classList={{
                    "border-border-strong bg-surface-muted text-content": !state.isFieldInvalid("email"),
                    "!border-danger/50 !bg-danger-soft text-content": state.isFieldInvalid("email"),
                  }}
                />
                <p id="checkout-email-hint" class="mt-space-2 text-sm text-content-muted">
                  {text().emailHint}
                </p>
              </div>

              <div>
                <label for="checkout-phone" class="mb-space-2 block text-sm font-medium text-content">
                  {text().phone}
                </label>
                <Input
                  id="checkout-phone"
                  type="tel"
                  autocomplete="tel"
                  value={state.contact().phone}
                  onInput={(event) => state.contactFieldChange("phone", event.currentTarget.value)}
                  class="focus-ring h-11 w-full rounded-control border border-border-strong bg-surface-muted px-space-4 text-sm text-content"
                />
              </div>

              <div>
                <label for="checkout-address" class="mb-space-2 block text-sm font-medium text-content">
                  {text().address}
                </label>
                <Input
                  id="checkout-address"
                  name="street-address"
                  autocomplete="street-address"
                  required={!props.relaxedValidation}
                  aria-invalid={state.isFieldInvalid("address") ? "true" : undefined}
                  value={state.contact().address}
                  onInput={(event) => state.contactFieldChange("address", event.currentTarget.value)}
                  class="focus-ring h-11 w-full rounded-control border px-space-4 text-sm"
                  classList={{
                    "border-border-strong bg-surface-muted text-content": !state.isFieldInvalid("address"),
                    "!border-danger/50 !bg-danger-soft text-content": state.isFieldInvalid("address"),
                  }}
                />
              </div>

              <section
                class="flex flex-col gap-space-4 border-t border-border-subtle pt-space-4"
                aria-labelledby="checkout-participants"
              >
                <div>
                  <h2 id="checkout-participants" class="text-lg font-semibold text-content">
                    {text().participantTitle}
                  </h2>
                </div>
                <div class="grid gap-space-4 sm:grid-cols-2">
                  <Index each={state.participantFields()}>
                    {(field) => {
                      const currentField = field()
                      const inputId = `checkout-participant-${currentField.eventId}-${currentField.tierId}-${currentField.ticketIndex}`
                      const fieldKey = ticketParticipantFieldKeyCreate(
                        currentField.eventId,
                        currentField.tierId,
                        currentField.ticketIndex,
                      )
                      return (
                        <div>
                          <label for={inputId} class="mb-space-2 block text-sm font-medium text-content">
                            {currentField.tierName}
                          </label>
                          <Input
                            id={inputId}
                            name={`participant-${currentField.eventId}-${currentField.tierId}-${currentField.ticketIndex}`}
                            autocomplete="name"
                            required
                            aria-invalid={state.isFieldInvalid(fieldKey) ? "true" : undefined}
                            value={currentField.value}
                            onInput={(event) =>
                              state.participantNameChange(
                                currentField.eventId,
                                currentField.tierId,
                                currentField.ticketIndex,
                                event.currentTarget.value,
                              )
                            }
                            class="focus-ring h-11 rounded-control border px-space-4 text-sm"
                            classList={{
                              "border-border-strong bg-surface-muted text-content": !state.isFieldInvalid(fieldKey),
                              "!border-danger/50 !bg-danger-soft text-content": state.isFieldInvalid(fieldKey),
                            }}
                          />
                        </div>
                      )
                    }}
                  </Index>
                </div>
              </section>

              <section class="flex flex-col gap-space-4 border-t border-border-subtle pt-space-4">
                <label
                  for="checkout-legal-acceptance"
                  class="flex items-start gap-space-3 rounded-control border border-brand-accent/30 bg-brand-soft p-space-4 text-base font-medium text-content"
                >
                  <Input
                    id="checkout-legal-acceptance"
                    type="checkbox"
                    checked={state.legalAccepted()}
                    onChange={(event) => state.legalAcceptanceChange(event.currentTarget.checked)}
                    class="mt-0.5 size-5 shrink-0 accent-brand"
                  />
                  <span>
                    {text().legalBeforeTerms}{" "}
                    <a href={legalLinks.terms} class="underline underline-offset-4">
                      {text().terms}
                    </a>{" "}
                    {text().legalBetweenLinks}
                    <a href={legalLinks.privacy} class="ml-1 underline underline-offset-4">
                      {text().privacy}
                    </a>{" "}
                    {text().legalAfterPrivacy}
                  </span>
                </label>

                <Show when={state.errorMessage()}>
                  <p
                    role="alert"
                    class="rounded-control border border-danger/50 bg-danger-soft px-space-4 py-space-3 text-sm font-medium text-danger"
                  >
                    {state.errorMessage()}
                  </p>
                </Show>

                <UiButton type="submit" size="lg" block disabled={state.isCartEmpty() || state.isSubmitting()}>
                  {state.isSubmitting() ? text().submitting : (props.submitLabel ?? text().submit)}
                </UiButton>
              </section>
            </form>
          </UiCard>

          <div class="flex flex-col gap-space-4">
            <For each={props.items}>{(item) => <TicketCartSummary event={item.event} cart={item.cart} />}</For>
          </div>
        </div>
      </Show>
    </div>
  )
}
