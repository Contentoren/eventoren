import { For, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import type { VeranstalterDashboardOrdersPageState } from "./veranstalterDashboardOrdersPageStateCreate.ts"
import { veranstalterDashboardOrdersMoneyFormat } from "./veranstalterDashboardOrdersMoneyFormat.ts"
import { veranstalterDashboardOrdersTimeFormat } from "./veranstalterDashboardOrdersTimeFormat.ts"

export function VeranstalterDashboardOrderDetail(p: { state: VeranstalterDashboardOrdersPageState }) {
  return (
    <Show when={p.state.detail()}>
      {(order) => (
        <div class="flex flex-col gap-5">
          <header>
            <h2 class="font-semibold">
              Bestellung {order().bookingNumber ?? "ohne Nummer"} · {order().eventTitle}
            </h2>
            <p>
              {order().status} / {order().paymentStatus} · {veranstalterDashboardOrdersMoneyFormat(order().totalCents)}
            </p>
            <p class="text-sm">Erstellt: {veranstalterDashboardOrdersTimeFormat(order().createdAt)}</p>
            <p class="text-sm">
              Grundbetrag {veranstalterDashboardOrdersMoneyFormat(order().subtotalCents)} · Gebühren{" "}
              {veranstalterDashboardOrdersMoneyFormat(order().feeCents)}
            </p>
          </header>
          <section class="flex flex-col gap-2">
            <h3 class="font-semibold">Historischer Käuferkontakt</h3>
            <p>
              {order().historicalContact.givenName} {order().historicalContact.familyName} ·{" "}
              {order().historicalContact.email}
            </p>
            <p>
              {order().historicalContact.phone} {order().historicalContact.address}
            </p>
            <p class="text-sm text-content-muted">
              Rechnungsdaten und historische Bestellnachweise bleiben unverändert. Die folgenden Felder ändern nur den
              operativen Kontakt; kein Zugriffs-/Eigentumswechsel und kein E-Mail-Versand. Leer = historischen Kontakt
              verwenden.
            </p>
            <Show when={p.state.canEdit()}>
              <form onSubmit={p.state.contactSubmit} class="flex flex-col gap-2">
                <Input
                  aria-label="Operativer Vorname"
                  placeholder="Operativer Vorname"
                  maxLength={120}
                  value={p.state.contact().givenName}
                  onInput={(e) => p.state.contactChange("givenName", e.currentTarget.value)}
                  disabled={p.state.busy()}
                />
                <Input
                  aria-label="Operativer Nachname"
                  placeholder="Operativer Nachname"
                  maxLength={120}
                  value={p.state.contact().familyName}
                  onInput={(e) => p.state.contactChange("familyName", e.currentTarget.value)}
                  disabled={p.state.busy()}
                />
                <Input
                  type="email"
                  aria-label="Operative E-Mail"
                  placeholder="Operative E-Mail"
                  maxLength={254}
                  value={p.state.contact().email}
                  onInput={(e) => p.state.contactChange("email", e.currentTarget.value)}
                  disabled={p.state.busy()}
                />
                <Input
                  type="tel"
                  aria-label="Operatives Telefon"
                  placeholder="Operatives Telefon"
                  maxLength={80}
                  value={p.state.contact().phone}
                  onInput={(e) => p.state.contactChange("phone", e.currentTarget.value)}
                  disabled={p.state.busy()}
                />
                <Button type="submit" variant="outline" disabled={p.state.busy()}>
                  Operativen Kontakt speichern
                </Button>
              </form>
            </Show>
          </section>
          <section class="flex flex-col gap-2">
            <h3 class="font-semibold">Positionen (historisch)</h3>
            <For each={order().lines}>
              {(line) => (
                <p>
                  {line.quantity} × {line.tierName} · {veranstalterDashboardOrdersMoneyFormat(line.priceCents)} +{" "}
                  {veranstalterDashboardOrdersMoneyFormat(line.feeCents)} Gebühr je Ticket
                </p>
              )}
            </For>
            <Show when={order().truncated.lines}>
              <p role="status">Nur die ersten 50 Positionen werden angezeigt.</p>
            </Show>
          </section>
          <section class="flex flex-col gap-2">
            <h3 class="font-semibold">Ausgestellte Tickets / Teilnehmerbeschriftung</h3>
            <p class="text-sm text-content-muted">
              Name und E-Mail sind operative Beschriftungen. Kein Identitäts-/Eigentumswechsel, keine neue
              Zugriffsberechtigung, kein Versand.
            </p>
            <For each={order().tickets} fallback={<p>Keine ausgestellten Tickets.</p>}>
              {(ticket) => (
                <form
                  onSubmit={(event) => p.state.holderSubmit(ticket.ticketId, event)}
                  class="flex flex-col gap-2 rounded-md border border-input p-3"
                >
                  <p>
                    Nr. {ticket.sequence} · {ticket.tierName} ·{" "}
                    {ticket.cancelled
                      ? "Gesperrt"
                      : ticket.checkedInAt
                        ? `Eingecheckt: ${veranstalterDashboardOrdersTimeFormat(ticket.checkedInAt)}`
                        : "Nicht eingecheckt"}
                  </p>
                  <Input
                    name="participantName"
                    aria-label={`Teilnehmername Ticket ${ticket.sequence}`}
                    value={p.state.holderDraft(ticket.ticketId)?.participantName ?? ticket.participantName}
                    onInput={(event) => p.state.holderChange(ticket.ticketId, "participantName", event.currentTarget.value)}
                    maxLength={240}
                    disabled={!p.state.canEdit() || p.state.busy()}
                  />
                  <Input
                    name="participantEmail"
                    type="email"
                    aria-label={`Teilnehmer-E-Mail Ticket ${ticket.sequence}`}
                    value={p.state.holderDraft(ticket.ticketId)?.participantEmail ?? ticket.participantEmail}
                    onInput={(event) => p.state.holderChange(ticket.ticketId, "participantEmail", event.currentTarget.value)}
                    maxLength={254}
                    disabled={!p.state.canEdit() || p.state.busy()}
                  />
                  <Show when={p.state.canEdit()}>
                    <Button type="submit" variant="outline" disabled={p.state.busy()}>
                      Teilnehmerbeschriftung speichern
                    </Button>
                  </Show>
                </form>
              )}
            </For>
            <Show when={order().truncated.tickets}>
              <p role="status">
                Nur die ersten 50 Tickets werden angezeigt. Die Event-Teilnehmerliste bietet weitere Fenster.
              </p>
            </Show>
          </section>
          <section class="flex flex-col gap-2">
            <h3 class="font-semibold">Interne Notizen</h3>
            <For each={order().notes} fallback={<p>Keine internen Notizen.</p>}>
              {(note) => (
                <article class="rounded-md border border-input p-3">
                  <p class="whitespace-pre-wrap">{note.text}</p>
                  <p class="text-xs">{veranstalterDashboardOrdersTimeFormat(note.createdAt)}</p>
                  <Show when={p.state.canEdit()}>
                    <Button variant="ghost" disabled={p.state.busy()} onClick={() => p.state.noteDelete(note.noteId)}>
                      Notiz löschen
                    </Button>
                  </Show>
                </article>
              )}
            </For>
            <Show when={order().truncated.notes}>
              <p role="status">Nur die neuesten 50 Notizen werden angezeigt.</p>
            </Show>
            <Show when={p.state.canEdit()}>
              <form onSubmit={p.state.noteSubmit} class="flex flex-col gap-2">
                <Textarea
                  aria-label="Neue interne Notiz"
                  value={p.state.note()}
                  onInput={(e) => p.state.noteChange(e.currentTarget.value)}
                  maxLength={1000}
                  required
                  disabled={p.state.busy()}
                />
                <Button type="submit" variant="outline" disabled={p.state.busy()}>
                  Interne Notiz speichern
                </Button>
              </form>
            </Show>
          </section>
          <Show when={p.state.message()}>
            <p role="status">{p.state.message()}</p>
          </Show>
        </div>
      )}
    </Show>
  )
}
