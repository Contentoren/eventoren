import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { classArr } from "../ui/classArr.ts"

export function ContactFaqList(props: { expandedFaqId: () => string | null; onToggleFaq: (id: string) => void }) {
  const faqs = [
    {
      id: "faq-1",
      question: "Wie schnell kann ich mein Event auf Eventoren veröffentlichen?",
      answer:
        "Nach deiner Kontaktaufnahme erstellen wir deinen Veranstalter-Account in der Regel innerhalb von 24 Stunden. Du kannst sofort Ticketkategorien anlegen, Kontingente steuern und den Vorverkauf starten.",
    },
    {
      id: "faq-2",
      question: "Welche Gebühren fallen für Veranstalter an?",
      answer:
        "Das Erstellen und Verwalten von Events ist komplett kostenfrei (0 € Grundgebühr). Es fällt lediglich eine geringe transaktionsbasierte Servicegebühr pro verkauftem Ticket an, die transparent im Vorfeld vereinbart wird.",
    },
    {
      id: "faq-3",
      question: "Wie funktioniert die Einlasskontrolle am Veranstaltungstag?",
      answer:
        "Du und dein Einlassteam erhalten Zugang zu unserer kostenlosen Einlass-Scanner-App (für iOS & Android). Tickets mit QR-Codes werden in Echtzeit synchronisiert und können auch bei instabiler Internetverbindung offline gescannt werden.",
    },
    {
      id: "faq-4",
      question: "Wo finden Besucher ihre gekauften Tickets?",
      answer:
        "Gekaufte Tickets werden direkt per E-Mail versendet und sind als Apple- und Google-Wallet-Pass offline auf dem Smartphone verfügbar.",
    },
    {
      id: "faq-5",
      question: "Gibt es eine Mindestvertragslaufzeit oder Mindestmengen?",
      answer:
        "Nein. Du kannst Eventoren für ein einzelnes Club-Event, eine Tournee oder wiederkehrende Festivals nutzen. Es gibt keine Vertragsbindung oder Mindestmengen.",
    },
  ]

  return (
    <section
      aria-labelledby="contact-faqs-title"
      class="flex flex-col gap-space-4 border-t border-border-subtle pt-space-6 dark:border-border-strong/30"
    >
      <h2 id="contact-faqs-title" class="text-xl font-semibold tracking-tight text-content">
        Häufige Fragen für Veranstalter & Besucher
      </h2>

      <ul class="flex flex-col gap-space-3">
        <For each={faqs}>
          {(faq) => {
            const isExpanded = () => props.expandedFaqId() === faq.id

            return (
              <li class="overflow-hidden rounded-xl border border-border-subtle bg-surface transition-colors dark:border-border-strong/30">
                <Button
                  variant="none"
                  size="none"
                  type="button"
                  class="focus-ring flex w-full items-center justify-between gap-space-4 p-space-4 text-left font-medium text-content transition-colors hover:bg-surface-muted/50 sm:p-space-5"
                  aria-expanded={isExpanded()}
                  onClick={() => props.onToggleFaq(faq.id)}
                >
                  <span class="text-sm font-semibold sm:text-base">{faq.question}</span>
                  <div
                    class="flex size-7 shrink-0 items-center justify-center rounded-full border border-border-subtle/60 bg-surface-muted/40 text-content-muted transition-colors group-hover:border-border-strong group-hover:text-content"
                    aria-hidden="true"
                  >
                    <svg
                      class={classArr(
                        "size-4 stroke-[2] transition-transform duration-200",
                        isExpanded() && "rotate-180",
                      )}
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M3.5 6l4.5 4.5 4.5-4.5" />
                    </svg>
                  </div>
                </Button>

                <Show when={isExpanded()}>
                  <div class="border-t border-border-subtle/50 px-space-4 py-space-4 text-sm leading-relaxed text-content-muted sm:px-space-5 dark:border-border-strong/20">
                    <p>{faq.answer}</p>
                  </div>
                </Show>
              </li>
            )
          }}
        </For>
      </ul>
    </section>
  )
}
