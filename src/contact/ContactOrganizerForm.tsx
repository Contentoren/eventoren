import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonCva2 } from "#ui/interactive/button/buttonCva.js"
import { classesButtonClickAnimation } from "#ui/interactive/button/classesButtonClickAnimation.js"
import type { SignalObject } from "#ui/utils/createSignalObject.js"
import { classArr } from "../ui/classArr.ts"
import { UiCard } from "../ui/UiCard.tsx"
import { contactMailToGet } from "./contactMailToGet.ts"
import type { ContactInquiryType } from "./contactPageStateCreate.ts"

export function ContactOrganizerForm(props: {
  inquiryType: SignalObject<ContactInquiryType>
  name: SignalObject<string>
  email: SignalObject<string>
  organization: SignalObject<string>
  eventType: SignalObject<string>
  expectedTickets: SignalObject<string>
  message: SignalObject<string>
  isSubmitting: SignalObject<boolean>
  isSubmitted: SignalObject<boolean>
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
          <p class="text-sm text-content-muted">
            Das Online-Formular ist derzeit nicht verfügbar – schreibe uns einfach direkt per E-Mail, wir melden uns
            schnellstmöglich bei dir.
          </p>
        </div>

        {/* Inquiry Type Tabs */}
        <div class="flex rounded-control border border-border-subtle bg-surface-muted/60 p-1" role="tablist">
          <Button
            variant="none"
            size="none"
            type="button"
            role="tab"
            aria-selected={props.inquiryType.get() === "veranstalter"}
            onClick={() => props.inquiryType.set("veranstalter")}
            class={classArr(
              "flex-1 rounded-lg py-2 text-center text-xs font-semibold transition-all sm:text-sm",
              props.inquiryType.get() === "veranstalter"
                ? "bg-surface text-content shadow-xs"
                : "text-content-muted hover:text-content",
            )}
          >
            Für Veranstalter
          </Button>
          <Button
            variant="none"
            size="none"
            type="button"
            role="tab"
            aria-selected={props.inquiryType.get() === "support"}
            onClick={() => props.inquiryType.set("support")}
            class={classArr(
              "flex-1 rounded-lg py-2 text-center text-xs font-semibold transition-all sm:text-sm",
              props.inquiryType.get() === "support"
                ? "bg-surface text-content shadow-xs"
                : "text-content-muted hover:text-content",
            )}
          >
            Besucher-Support
          </Button>
        </div>

        <form class="flex flex-col gap-space-4" onSubmit={(e) => props.onSubmit(e)}>
          <div class="grid gap-space-4 sm:grid-cols-2">
            <div>
              <label for="contact-name" class="mb-space-1.5 block text-sm font-medium text-content">
                Vollständiger Name *
              </label>
              <input
                id="contact-name"
                value={props.name.get()}
                onInput={(e) => props.name.set(e.currentTarget.value)}
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
                value={props.email.get()}
                onInput={(e) => props.email.set(e.currentTarget.value)}
                placeholder="name@beispiel.de"
                class="focus-ring h-11 w-full rounded-control border border-border-strong bg-surface-muted px-space-4 text-sm text-content"
              />
            </div>
          </div>

          <div
            class={classArr("grid gap-space-4 sm:grid-cols-2", props.inquiryType.get() !== "veranstalter" && "hidden")}
          >
            <div>
              <label for="contact-org" class="mb-space-1.5 block text-sm font-medium text-content">
                Veranstalter / Unternehmen
              </label>
              <input
                id="contact-org"
                value={props.organization.get()}
                onInput={(e) => props.organization.set(e.currentTarget.value)}
                placeholder="z. B. Konzertagentur Nord GmbH"
                class="focus-ring h-11 w-full rounded-control border border-border-strong bg-surface-muted px-space-4 text-sm font-medium text-content"
              />
            </div>

            <div>
              <label for="contact-event-type" class="mb-space-1.5 block text-sm font-medium text-content">
                Event-Kategorie
              </label>
              <select
                id="contact-event-type"
                value={props.eventType.get()}
                onChange={(e) => props.eventType.set(e.currentTarget.value)}
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

          <div class={classArr(props.inquiryType.get() !== "veranstalter" && "hidden")}>
            <label for="contact-capacity" class="mb-space-1.5 block text-sm font-medium text-content">
              Erwartete Ticketanzahl pro Event
            </label>
            <select
              id="contact-capacity"
              value={props.expectedTickets.get()}
              onChange={(e) => props.expectedTickets.set(e.currentTarget.value)}
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
              rows={4}
              value={props.message.get()}
              onInput={(e) => props.message.set(e.currentTarget.value)}
              placeholder={
                props.inquiryType.get() === "veranstalter"
                  ? "Beschreibe kurz dein Event, geplante Termine oder gewünschte Ticketing-Features..."
                  : "Wie können wir dir bei deiner Buchung oder deinen Tickets weiterhelfen?"
              }
              class="focus-ring w-full rounded-control border border-border-strong bg-surface-muted p-space-4 text-sm text-content leading-relaxed"
            />
          </div>

          <div
            role="status"
            class="flex flex-col items-start gap-space-3 rounded-2xl border border-warning/30 bg-warning-soft/30 p-space-5 text-left"
          >
            <h3 class="text-base font-bold text-content">Online-Versand derzeit deaktiviert</h3>
            <p class="text-sm text-content-muted">
              Dieses Formular wird derzeit nicht übermittelt und speichert nichts – damit keine Nachricht verloren geht,
              nutze bitte die E-Mail-Adresse für dein Anliegen. Erwähne kurz Name und, falls vorhanden, Veranstalter und
              Event.
            </p>
            <a
              href={contactMailToGet(props.inquiryType.get())}
              class={buttonCva2("filled", "default", classesButtonClickAnimation, "w-full sm:w-auto")}
            >
              {props.inquiryType.get() === "veranstalter"
                ? "E-Mail an partner@eventoren.de"
                : "E-Mail an support@eventoren.de"}
            </a>
          </div>
        </form>
      </section>
    </UiCard>
  )
}
