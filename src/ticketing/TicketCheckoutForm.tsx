import { For, Index, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import type { EventItem } from "../events/EventItem.ts"
import { UiButton } from "../ui/UiButton.tsx"
import { UiCard } from "../ui/UiCard.tsx"
import type { TicketCart } from "./TicketCart.ts"
import { TicketCartSummary } from "./TicketCartSummary.tsx"
import type { TicketCheckoutFormState } from "./TicketCheckoutFormState.ts"
import { ticketCheckoutText } from "./ticketCheckoutText.ts"
import { ticketParticipantFieldKeyCreate } from "./ticketParticipantFieldKeyCreate.ts"

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

              <fieldset class="flex flex-col gap-space-4">
                <legend class="mb-space-2 text-sm font-medium text-content">Rechnungsempfänger</legend>
                <div
                  class="grid grid-cols-2 gap-space-2 rounded-control border border-border-subtle bg-surface-muted p-space-1"
                  role="radiogroup"
                  aria-label="Rechnungsempfänger"
                >
                  <label
                    for="checkout-billing-person"
                    class="relative flex min-h-10 cursor-pointer items-center justify-center rounded-control px-space-3 text-sm font-medium focus-within:ring-2 focus-within:ring-brand-accent focus-within:ring-offset-2"
                    classList={{
                      "bg-surface text-content shadow-sm": state.contact().billingKind === "person",
                      "text-content-muted": state.contact().billingKind !== "person",
                    }}
                  >
                    <Input
                      id="checkout-billing-person"
                      class="sr-only"
                      type="radio"
                      name="checkout-billing-kind"
                      value="person"
                      checked={state.contact().billingKind === "person"}
                      onChange={() => state.contactFieldChange("billingKind", "person")}
                    />
                    Privatperson
                  </label>
                  <label
                    for="checkout-billing-company"
                    class="relative flex min-h-10 cursor-pointer items-center justify-center rounded-control px-space-3 text-sm font-medium focus-within:ring-2 focus-within:ring-brand-accent focus-within:ring-offset-2"
                    classList={{
                      "bg-surface text-content shadow-sm": state.contact().billingKind === "company",
                      "text-content-muted": state.contact().billingKind !== "company",
                    }}
                  >
                    <Input
                      id="checkout-billing-company"
                      class="sr-only"
                      type="radio"
                      name="checkout-billing-kind"
                      value="company"
                      checked={state.contact().billingKind === "company"}
                      onChange={() => state.contactFieldChange("billingKind", "company")}
                    />
                    Unternehmen
                  </label>
                </div>
                <Show when={state.contact().billingKind === "company"}>
                  <div>
                    <label for="checkout-company" class="mb-space-2 block text-sm font-medium text-content">
                      Firmenname
                    </label>
                    <Input
                      id="checkout-company"
                      autocomplete="organization"
                      required={!props.relaxedValidation}
                      aria-invalid={state.isFieldInvalid("companyName") ? "true" : undefined}
                      value={state.contact().companyName}
                      onInput={(event) => state.contactFieldChange("companyName", event.currentTarget.value)}
                      class="focus-ring h-11 w-full rounded-control border px-space-4 text-sm"
                      classList={{
                        "border-border-strong bg-surface-muted text-content": !state.isFieldInvalid("companyName"),
                        "!border-danger/50 !bg-danger-soft text-content": state.isFieldInvalid("companyName"),
                      }}
                    />
                  </div>
                </Show>

                <div class="grid gap-space-4 sm:grid-cols-2">
                  <div>
                    <label for="checkout-first-name" class="mb-space-2 block text-sm font-medium text-content">
                      {state.contact().billingKind === "company" ? "Vorname Ansprechpartner" : text().firstName}
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
                      {state.contact().billingKind === "company" ? "Nachname Ansprechpartner" : text().lastName}
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
                    Straße und Hausnummer
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

                <div>
                  <label for="checkout-address-line2" class="mb-space-2 block text-sm font-medium text-content">
                    Adresszusatz (optional)
                  </label>
                  <Input
                    id="checkout-address-line2"
                    autocomplete="address-line2"
                    value={state.contact().addressLine2}
                    onInput={(event) => state.contactFieldChange("addressLine2", event.currentTarget.value)}
                    class="focus-ring h-11 w-full rounded-control border border-border-strong bg-surface-muted px-space-4 text-sm text-content"
                  />
                </div>
                <div class="grid grid-cols-[7rem_minmax(0,1fr)] gap-space-4">
                  <div>
                    <label for="checkout-postal-code" class="mb-space-2 block text-sm font-medium text-content">
                      PLZ
                    </label>
                    <Input
                      id="checkout-postal-code"
                      autocomplete="postal-code"
                      required={!props.relaxedValidation}
                      aria-invalid={state.isFieldInvalid("postalCode") ? "true" : undefined}
                      value={state.contact().postalCode}
                      onInput={(event) => state.contactFieldChange("postalCode", event.currentTarget.value)}
                      class="focus-ring h-11 w-full rounded-control border px-space-4 text-sm"
                      classList={{
                        "border-border-strong bg-surface-muted text-content": !state.isFieldInvalid("postalCode"),
                        "!border-danger/50 !bg-danger-soft text-content": state.isFieldInvalid("postalCode"),
                      }}
                    />
                  </div>
                  <div>
                    <label for="checkout-city" class="mb-space-2 block text-sm font-medium text-content">
                      Ort
                    </label>
                    <Input
                      id="checkout-city"
                      autocomplete="address-level2"
                      required={!props.relaxedValidation}
                      aria-invalid={state.isFieldInvalid("city") ? "true" : undefined}
                      value={state.contact().city}
                      onInput={(event) => state.contactFieldChange("city", event.currentTarget.value)}
                      class="focus-ring h-11 w-full rounded-control border px-space-4 text-sm"
                      classList={{
                        "border-border-strong bg-surface-muted text-content": !state.isFieldInvalid("city"),
                        "!border-danger/50 !bg-danger-soft text-content": state.isFieldInvalid("city"),
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label for="checkout-country" class="mb-space-2 block text-sm font-medium text-content">
                    Ländercode (z. B. DE)
                  </label>
                  <Input
                    id="checkout-country"
                    autocomplete="off"
                    maxlength={2}
                    pattern="[A-Z]{2}"
                    required={!props.relaxedValidation}
                    aria-invalid={state.isFieldInvalid("country") ? "true" : undefined}
                    value={state.contact().country}
                    onInput={(event) =>
                      state.contactFieldChange(
                        "country",
                        event.currentTarget.value.toUpperCase().replace(/[^A-Z]/g, ""),
                      )
                    }
                    class="focus-ring h-11 w-full rounded-control border px-space-4 text-sm"
                    classList={{
                      "border-border-strong bg-surface-muted text-content": !state.isFieldInvalid("country"),
                      "!border-danger/50 !bg-danger-soft text-content": state.isFieldInvalid("country"),
                    }}
                  />
                </div>
                <Show when={state.contact().billingKind === "company"}>
                  <div>
                    <label for="checkout-company-extra" class="mb-space-2 block text-sm font-medium text-content">
                      Zusatzinformationen (optional)
                    </label>
                    <Input
                      id="checkout-company-extra"
                      autocomplete="organization-title"
                      value={state.contact().companyExtra}
                      onInput={(event) => state.contactFieldChange("companyExtra", event.currentTarget.value)}
                      class="focus-ring h-11 w-full rounded-control border border-border-strong bg-surface-muted px-space-4 text-sm text-content"
                    />
                  </div>
                  <div>
                    <label for="checkout-tax-id" class="mb-space-2 block text-sm font-medium text-content">
                      EU-USt-IdNr. (optional)
                    </label>
                    <Input
                      id="checkout-tax-id"
                      autocomplete="off"
                      value={state.contact().taxId}
                      onInput={(event) => state.contactFieldChange("taxId", event.currentTarget.value.toUpperCase())}
                      aria-invalid={state.isFieldInvalid("taxId") ? "true" : undefined}
                      class="focus-ring h-11 w-full rounded-control border border-border-strong bg-surface-muted px-space-4 text-sm text-content"
                    />
                  </div>
                </Show>
              </fieldset>

              <For each={props.items}>
                {(item) => {
                  const eventParticipantFields = () =>
                    state.participantFields().filter((field) => field.eventId === item.event.id)
                  const headingId = `checkout-participants-${item.event.id}`

                  return (
                    <Show when={eventParticipantFields().length > 0}>
                      <section
                        class="flex flex-col gap-space-4 border-t border-border-subtle pt-space-4"
                        aria-labelledby={headingId}
                      >
                        <div>
                          <h2 id={headingId} class="text-lg font-semibold text-content">
                            {item.event.title}
                          </h2>
                        </div>
                        <div class="grid gap-space-4 sm:grid-cols-2">
                          <Index each={eventParticipantFields()}>
                            {(field) => {
                              const inputId = () =>
                                `checkout-participant-${field().eventId}-${field().tierId}-${field().ticketIndex}`
                              const fieldKey = () =>
                                ticketParticipantFieldKeyCreate(field().eventId, field().tierId, field().ticketIndex)
                              const labelText = () =>
                                field().totalForTier !== undefined && field().totalForTier! > 1
                                  ? `${text().participantTitle} - ${field().tierName} (${field().ticketIndex + 1})`
                                  : `${text().participantTitle} - ${field().tierName}`

                              return (
                                <div>
                                  <label for={inputId()} class="mb-space-2 block text-sm font-medium text-content">
                                    {labelText()}
                                  </label>
                                  <Input
                                    id={inputId()}
                                    name={`participant-${field().eventId}-${field().tierId}-${field().ticketIndex}`}
                                    autocomplete="name"
                                    required
                                    aria-invalid={state.isFieldInvalid(fieldKey()) ? "true" : undefined}
                                    value={field().value}
                                    onInput={(event) =>
                                      state.participantNameChange(
                                        field().eventId,
                                        field().tierId,
                                        field().ticketIndex,
                                        event.currentTarget.value,
                                      )
                                    }
                                    class="focus-ring h-11 rounded-control border px-space-4 text-sm"
                                    classList={{
                                      "border-border-strong bg-surface-muted text-content": !state.isFieldInvalid(
                                        fieldKey(),
                                      ),
                                      "!border-danger/50 !bg-danger-soft text-content": state.isFieldInvalid(
                                        fieldKey(),
                                      ),
                                    }}
                                  />
                                </div>
                              )
                            }}
                          </Index>
                        </div>
                      </section>
                    </Show>
                  )
                }}
              </For>

              <Show
                when={
                  state
                    .participantFields()
                    .filter((field) => !props.items.some((item) => item.event.id === field.eventId)).length > 0
                }
              >
                <section
                  class="flex flex-col gap-space-4 border-t border-border-subtle pt-space-4"
                  aria-labelledby="checkout-participants-other"
                >
                  <div>
                    <h2 id="checkout-participants-other" class="text-lg font-semibold text-content">
                      {text().participantTitle}
                    </h2>
                  </div>
                  <div class="grid gap-space-4 sm:grid-cols-2">
                    <Index
                      each={state
                        .participantFields()
                        .filter((field) => !props.items.some((item) => item.event.id === field.eventId))}
                    >
                      {(field) => {
                        const inputId = () =>
                          `checkout-participant-${field().eventId}-${field().tierId}-${field().ticketIndex}`
                        const fieldKey = () =>
                          ticketParticipantFieldKeyCreate(field().eventId, field().tierId, field().ticketIndex)
                        const labelText = () =>
                          field().totalForTier !== undefined && field().totalForTier! > 1
                            ? `${text().participantTitle} - ${field().tierName} (${field().ticketIndex + 1})`
                            : `${text().participantTitle} - ${field().tierName}`

                        return (
                          <div>
                            <label for={inputId()} class="mb-space-2 block text-sm font-medium text-content">
                              {labelText()}
                            </label>
                            <Input
                              id={inputId()}
                              name={`participant-${field().eventId}-${field().tierId}-${field().ticketIndex}`}
                              autocomplete="name"
                              required
                              aria-invalid={state.isFieldInvalid(fieldKey()) ? "true" : undefined}
                              value={field().value}
                              onInput={(event) =>
                                state.participantNameChange(
                                  field().eventId,
                                  field().tierId,
                                  field().ticketIndex,
                                  event.currentTarget.value,
                                )
                              }
                              class="focus-ring h-11 rounded-control border px-space-4 text-sm"
                              classList={{
                                "border-border-strong bg-surface-muted text-content": !state.isFieldInvalid(fieldKey()),
                                "!border-danger/50 !bg-danger-soft text-content": state.isFieldInvalid(fieldKey()),
                              }}
                            />
                          </div>
                        )
                      }}
                    </Index>
                  </div>
                </section>
              </Show>

              <section class="flex flex-col gap-space-4 border-t border-border-subtle pt-space-4">
                <label
                  for="checkout-terms-acceptance"
                  class="flex items-start gap-space-3 rounded-control border border-brand-accent/30 bg-brand-soft p-space-4 text-base font-medium text-content"
                >
                  <Input
                    id="checkout-terms-acceptance"
                    type="checkbox"
                    required
                    checked={state.termsAccepted()}
                    onChange={(event) => state.termsAcceptanceChange(event.currentTarget.checked)}
                    class="mt-0.5 size-5 shrink-0 accent-brand"
                  />
                  <span>
                    Ich akzeptiere die{" "}
                    <a href={legalLinks.terms} target="_blank" rel="noreferrer" class="underline underline-offset-4">
                      {text().terms}
                    </a>{" "}
                    .
                  </span>
                </label>
                <label
                  for="checkout-privacy-acknowledgement"
                  class="flex items-start gap-space-3 rounded-control border border-brand-accent/30 bg-brand-soft p-space-4 text-base font-medium text-content"
                >
                  <Input
                    id="checkout-privacy-acknowledgement"
                    type="checkbox"
                    required
                    checked={state.privacyAcknowledged()}
                    onChange={(event) => state.privacyAcknowledgementChange(event.currentTarget.checked)}
                    class="mt-0.5 size-5 shrink-0 accent-brand"
                  />
                  <span>
                    Ich habe die{" "}
                    <a href={legalLinks.privacy} target="_blank" rel="noreferrer" class="underline underline-offset-4">
                      {text().privacy}
                    </a>{" "}
                    gelesen.
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
