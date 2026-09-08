import { Show } from "solid-js"
import { classArr } from "../ui/classArr.ts"
import { UiButton } from "../ui/UiButton.tsx"
import { UiCard } from "../ui/UiCard.tsx"
import type { ContactInquiryType } from "./contactPageStateCreate.ts"

export function ContactOrganizerForm(props: {
  inquiryType: () => ContactInquiryType
  setInquiryType: (type: ContactInquiryType) => void
  name: () => string
  setName: (val: string) => void
  email: () => string
  setEmail: (val: string) => void
  organization: () => string
  setOrganization: (val: string) => void
  eventType: () => string
  setEventType: (val: string) => void
  expectedTickets: () => string
  setExpectedTickets: (val: string) => void
  message: () => string
  setMessage: (val: string) => void
  isSubmitting: () => boolean
  isSubmitted: () => boolean
  onSubmit: (e: SubmitEvent) => void
  onReset: () => void
}) {
  return (
    <UiCard>
      <section aria-labelledby="contact-form-title" class="flex flex-col gap-space-5">
        <div class="flex flex-col gap-space-2">
          <h2 id="contact-form-title" class="text-xl font-semibold tracking-tight text-content">
            Nachricht senden
          </h2>
          <p class="text-sm text-content-muted">Fülle das Formular aus – wir melden uns schnellstmöglich bei dir.</p>
        </div>

        {/* Inquiry Type Tabs */}
        <div class="flex rounded-control border border-border-subtle bg-surface-muted/60 p-1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={props.inquiryType() === "veranstalter"}
            onClick={() => props.setInquiryType("veranstalter")}
            class={classArr(
              "flex-1 rounded-lg py-2 text-center text-xs font-semibold transition-all sm:text-sm",
              props.inquiryType() === "veranstalter"
                ? "bg-surface text-content shadow-xs"
                : "text-content-muted hover:text-content",
            )}
          >
            Für Veranstalter
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={props.inquiryType() === "support"}
            onClick={() => props.setInquiryType("support")}
            class={classArr(
              "flex-1 rounded-lg py-2 text-center text-xs font-semibold transition-all sm:text-sm",
              props.inquiryType() === "support"
                ? "bg-surface text-content shadow-xs"
                : "text-content-muted hover:text-content",
            )}
          >
            Besucher-Support
          </button>
        </div>

        <Show when={props.isSubmitted()}>
          <div class="flex flex-col items-center gap-space-4 rounded-2xl border border-success/30 bg-success-soft/30 p-space-6 text-center">
            <span
              aria-hidden="true"
              class="flex size-12 items-center justify-center rounded-full bg-success text-white shadow-xs"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" class="size-6">
                <path
                  fill-rule="evenodd"
                  d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                  clip-rule="evenodd"
                />
              </svg>
            </span>
            <h3 class="text-lg font-bold text-content">Vielen Dank für deine Anfrage!</h3>
            <p class="text-sm text-content-muted">
              Wir haben deine Nachricht erhalten und melden uns in der Regel innerhalb weniger Stunden bei dir.
            </p>
            <UiButton variant="secondary" size="md" onClick={() => props.onReset()}>
              Weitere Nachricht senden
            </UiButton>
          </div>
        </Show>

        <Show when={!props.isSubmitted()}>
          <form class="flex flex-col gap-space-4" onSubmit={(e) => props.onSubmit(e)}>
            <div class="grid gap-space-4 sm:grid-cols-2">
              <div>
                <label for="contact-name" class="mb-space-1.5 block text-sm font-medium text-content">
                  Vollständiger Name *
                </label>
                <input
                  id="contact-name"
                  required
                  value={props.name()}
                  onInput={(e) => props.setName(e.currentTarget.value)}
                  placeholder="z. B. Max Mustermann"
                  class="focus-ring h-11 w-full rounded-control border border-border-strong bg-surface-muted px-space-4 text-sm text-content"
                />
              </div>

              <div>
                <label for="contact-email" class="mb-space-1.5 block text-sm font-medium text-content">
                  E-Mail-Adresse *
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={props.email()}
                  onInput={(e) => props.setEmail(e.currentTarget.value)}
                  placeholder="name@beispiel.de"
                  class="focus-ring h-11 w-full rounded-control border border-border-strong bg-surface-muted px-space-4 text-sm text-content"
                />
              </div>
            </div>

            <div
              class={classArr("grid gap-space-4 sm:grid-cols-2", props.inquiryType() !== "veranstalter" && "hidden")}
            >
              <div>
                <label for="contact-org" class="mb-space-1.5 block text-sm font-medium text-content">
                  Veranstalter / Unternehmen
                </label>
                <input
                  id="contact-org"
                  value={props.organization()}
                  onInput={(e) => props.setOrganization(e.currentTarget.value)}
                  placeholder="z. B. Konzertagentur Nord GmbH"
                  class="focus-ring h-11 w-full rounded-control border border-border-strong bg-surface-muted px-space-4 text-sm text-content"
                />
              </div>

              <div>
                <label for="contact-event-type" class="mb-space-1.5 block text-sm font-medium text-content">
                  Event-Kategorie
                </label>
                <select
                  id="contact-event-type"
                  value={props.eventType()}
                  onChange={(e) => props.setEventType(e.currentTarget.value)}
                  class="focus-ring h-11 w-full rounded-control border border-border-strong bg-surface-muted px-space-4 text-sm font-medium text-content"
                >
                  <option value="Konzert / Festival">Konzert / Festival</option>
                  <option value="Kultur & Theater">Kultur & Theater</option>
                  <option value="Sportevent">Sportevent</option>
                  <option value="Reisen & Erlebnisse">Reisen & Erlebnisse</option>
                  <option value="Club / Party">Club / Party</option>
                  <option value="Konferenz / Messe">Konferenz / Messe</option>
                </select>
              </div>
            </div>

            <div class={classArr(props.inquiryType() !== "veranstalter" && "hidden")}>
              <label for="contact-capacity" class="mb-space-1.5 block text-sm font-medium text-content">
                Erwartete Ticketanzahl pro Event
              </label>
              <select
                id="contact-capacity"
                value={props.expectedTickets()}
                onChange={(e) => props.setExpectedTickets(e.currentTarget.value)}
                class="focus-ring h-11 w-full rounded-control border border-border-strong bg-surface-muted px-space-4 text-sm font-medium text-content"
              >
                <option value="Bis 250 Tickets">Bis 250 Tickets</option>
                <option value="250–1.000 Tickets">250–1.000 Tickets</option>
                <option value="1.000–5.000 Tickets">1.000–5.000 Tickets</option>
                <option value="5.000+ Tickets (Großveranstaltung)">5.000+ Tickets (Großveranstaltung)</option>
              </select>
            </div>

            <div>
              <label for="contact-message" class="mb-space-1.5 block text-sm font-medium text-content">
                Nachricht / Details zu deinem Anliegen *
              </label>
              <textarea
                id="contact-message"
                required
                rows={4}
                value={props.message()}
                onInput={(e) => props.setMessage(e.currentTarget.value)}
                placeholder={
                  props.inquiryType() === "veranstalter"
                    ? "Beschreibe kurz dein Event, geplante Termine oder gewünschte Ticketing-Features..."
                    : "Wie können wir dir bei deiner Buchung oder deinen Tickets weiterhelfen?"
                }
                class="focus-ring w-full rounded-control border border-border-strong bg-surface-muted p-space-4 text-sm text-content leading-relaxed"
              />
            </div>

            <UiButton type="submit" size="lg" block disabled={props.isSubmitting()}>
              {props.isSubmitting() ? "Wird gesendet..." : "Anfrage absenden"}
            </UiButton>
          </form>
        </Show>
      </section>
    </UiCard>
  )
}
