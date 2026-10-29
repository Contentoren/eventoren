import type { Accessor } from "solid-js"
import { eventCategoryLabels } from "../events/eventCategoryLabels.ts"
import { eventDateFormatLong } from "../events/eventDateFormatLong.ts"
import { eventPriceFormat } from "../events/eventPriceFormat.ts"
import { eventTimeFormat } from "../events/eventTimeFormat.ts"
import type { AdminEventItem } from "./AdminEventItem.ts"

type Field = { label: string; value: string | number | undefined }

function fieldsPresent(fields: Field[]) {
  return fields.filter((field) => field.value !== undefined && field.value !== "")
}

function dateTime(value?: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return undefined
  return `${eventDateFormatLong(value)}, ${eventTimeFormat(value)} (Europe/Berlin)`
}

export function adminArchivedEventDetailsStateCreate(event: Accessor<AdminEventItem>) {
  return {
    fields: () => {
      const item = event()
      return fieldsPresent([
        { label: "Untertitel", value: item.subtitle },
        { label: "Veranstalter", value: item.organizer },
        { label: "Kategorie", value: eventCategoryLabels[item.category] ?? item.category },
        { label: "Beginn", value: dateTime(item.startsAt) },
        { label: "Einlass", value: dateTime(item.doorsAt) },
        { label: "Ende", value: dateTime(item.endsAt) },
        { label: "Buchungsbeginn", value: dateTime(item.bookingOpensAt) },
        { label: "Veranstaltungsort", value: item.venue },
        { label: "Stadt", value: item.city },
        { label: "Adresse", value: item.address },
        { label: "Beschreibung", value: item.description },
        { label: "Tags", value: item.tags.join(", ") },
        { label: "Bild-URL", value: item.imageUrl },
        { label: "Alternativtext", value: item.imageAlt },
        {
          label: "Highlights",
          value: item.highlights?.map((entry) => `${entry.title}: ${entry.description}`).join("\n"),
        },
        { label: "Inklusive", value: item.inclusions?.join("\n") },
        { label: "Nicht enthalten", value: item.exclusions?.join("\n") },
        {
          label: "Ablauf",
          value: item.schedule
            ?.map((entry) => [entry.marker, entry.title, entry.detail].filter(Boolean).join(" · "))
            .join("\n"),
        },
        { label: "FAQ", value: item.faqs?.map((entry) => `${entry.question}\n${entry.answer}`).join("\n\n") },
        { label: "Zahlungsmethoden", value: item.allowedStripePaymentMethods?.join(", ") },
        { label: "Ausverkauft", value: item.soldOut ? "Ja" : "Nein" },
        { label: "Technischer Event-Key", value: item.id },
      ])
    },
    products: () =>
      event().tiers.map((tier) => ({
        id: tier.id,
        name: tier.name,
        fields: fieldsPresent([
          { label: "Beschreibung", value: tier.description },
          { label: "Preis", value: eventPriceFormat(tier.priceCents) },
          { label: "Gebühr", value: eventPriceFormat(tier.feeCents) },
          { label: "Kapazität", value: tier.capacity },
          { label: "Verfügbar", value: tier.available },
          { label: "Verkauft (Produktzähler)", value: tier.sold },
          { label: "Maximum pro Bestellung", value: tier.maxPerOrder },
          {
            label: "Aktivierungscode erforderlich",
            value: tier.activationCodeRequired === undefined ? undefined : tier.activationCodeRequired ? "Ja" : "Nein",
          },
          { label: "Beginn", value: dateTime(tier.startsAt) },
          { label: "Einlass", value: dateTime(tier.doorsAt) },
          { label: "Ende", value: dateTime(tier.endsAt) },
          {
            label: "Weitere Einlasszeiten",
            value: tier.additionalDoorsAt
              ?.map((range) => [dateTime(range.startsAt), dateTime(range.endsAt)].filter(Boolean).join(" – "))
              .join("\n"),
          },
          { label: "Sortierung", value: tier.sortOrder },
          { label: "Technischer Ticket-Key", value: tier.id },
        ]),
      })),
  }
}
