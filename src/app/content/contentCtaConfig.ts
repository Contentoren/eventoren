type ContentCta = {
  readonly heading: string
  readonly text: string
  readonly facts: readonly string[]
  readonly actions: readonly { readonly label: string; readonly href: "/kontakt" | "/"; readonly primary: boolean }[]
}

/** CTA box copy after an article, by language and variant. Only claims from the plan's product facts. */
export const contentCtaConfig: Readonly<Record<"de" | "en", Readonly<Record<"organiser" | "buyer", ContentCta>>>> = {
  de: {
    organiser: {
      heading: "Tickets für dein Event online verkaufen",
      text: "Mit Eventoren verkaufst du Tickets für 3,9 % + 0,49 € pro bezahltem Ticket, inklusive MwSt. und Zahlungsabwicklung.",
      facts: [
        "Keine Grundgebühr, kein Mindestumsatz, jederzeit kündbar",
        "QR-Einlass per Scanner-Link im Smartphone-Browser, ohne App",
        "Auszahlung per Überweisung auf deine IBAN",
      ],
      actions: [
        { label: "Veranstalter werden", href: "/kontakt", primary: true },
        { label: "Events entdecken", href: "/", primary: false },
      ],
    },
    buyer: {
      heading: "Tickets für Events entdecken",
      text: "Bei Eventoren kaufst du als Gast ohne Kundenkonto. Dein Ticket kommt als PDF mit QR-Code per E-Mail.",
      facts: [
        "Zahlung per Karte, Apple Pay, Google Pay, Klarna oder SEPA-Lastschrift",
        "Jedes Ticket mit eigenem QR-Code für den Einlass",
      ],
      actions: [{ label: "Events entdecken", href: "/", primary: true }],
    },
  },
  en: {
    organiser: {
      heading: "Sell tickets for your event online",
      text: "With Eventoren you pay 3.9% + €0.49 per paid ticket, including VAT and payment processing.",
      facts: [
        "No base fee, no minimum revenue, cancel anytime",
        "QR check-in via a scanner link in the phone browser, no app needed",
        "Payout by bank transfer to your IBAN",
      ],
      actions: [
        { label: "Become an organiser", href: "/kontakt", primary: true },
        { label: "Discover events", href: "/", primary: false },
      ],
    },
    buyer: {
      heading: "Discover events and buy tickets",
      text: "On Eventoren you check out as a guest, no account needed. Your ticket arrives by email as a PDF with a QR code.",
      facts: [
        "Pay by card, Apple Pay, Google Pay, Klarna or SEPA direct debit",
        "Every ticket has its own QR code for entry",
      ],
      actions: [{ label: "Discover events", href: "/", primary: true }],
    },
  },
}
