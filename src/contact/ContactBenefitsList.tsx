import { For } from "solid-js"

export function ContactBenefitsList() {
  const benefits = [
    {
      title: "0 € Einrichtungsgebühr",
      description:
        "Keine fixen monatlichen Kosten oder versteckte Gebühren. Du zahlst nur bei erfolgreichen Ticketverkäufen.",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-5">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      title: "Apple & Google Wallet Pässe",
      description:
        "Deine Gäste erhalten mit einem Klick einen nativen Wallet-Pass mit dynamischem QR-Code für den Offline-Einlass.",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-5">
          <rect width="18" height="14" x="3" y="5" rx="3" />
          <path d="M3 10h18" />
          <path d="M16 15h2" stroke-linecap="round" />
        </svg>
      ),
    },
    {
      title: "Mobile Einlass-Scanner-App",
      description: "Sekundenschnelles Scannen von Online- und Offline-Tickets mit jedem handelsüblichen Smartphone.",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-5">
          <rect width="14" height="20" x="5" y="2" rx="2" />
          <path d="M12 18h.01" />
          <path d="M9 7h6M9 11h6" />
        </svg>
      ),
    },
    {
      title: "Sofortige & sichere Auszahlung",
      description:
        "Automatisierte Abrechnung und transparente Überweisung deiner Ticketerlöse auf dein Geschäftskonto.",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-5">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
  ]

  return (
    <section aria-labelledby="benefits-title" class="flex flex-col gap-space-4">
      <h2 id="benefits-title" class="text-xl font-semibold tracking-tight text-content">
        Warum Veranstalter Eventoren wählen
      </h2>

      <div class="grid gap-space-4 sm:grid-cols-2">
        <For each={benefits}>
          {(benefit) => (
            <div class="flex flex-col gap-space-2.5 rounded-2xl border border-border-subtle bg-surface p-space-5 shadow-xs dark:border-border-strong/30">
              <div class="flex size-10 items-center justify-center rounded-xl border border-brand-accent/20 bg-brand-soft text-brand-accent shadow-xs">
                {benefit.icon}
              </div>
              <h3 class="text-base font-semibold text-content">{benefit.title}</h3>
              <p class="text-sm leading-relaxed text-content-muted">{benefit.description}</p>
            </div>
          )}
        </For>
      </div>
    </section>
  )
}
