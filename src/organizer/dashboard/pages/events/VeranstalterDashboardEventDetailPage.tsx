import { mdiAlertOutline } from "@adaptive-ds/mdi/mdiAlertOutline.js"
import { mdiArchiveOutline } from "@adaptive-ds/mdi/mdiArchiveOutline.js"
import { mdiTicketOutline } from "@adaptive-ds/mdi/mdiTicketOutline.js"
import { Link } from "@tanstack/solid-router"
import { For, Index, Show } from "solid-js"
import { InputDateTime } from "#ui/input/datetime/InputDateTime.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ConfirmDialog } from "#ui/interactive/dialog/ConfirmDialog.jsx"
import { Sheet } from "#ui/interactive/sheet/Sheet.jsx"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { VeranstalterDashboardLoadingState } from "../../ui/VeranstalterDashboardLoadingState.tsx"
import type { VeranstalterDashboardEventDetailState } from "./veranstalterDashboardEventDetailStateCreate.ts"
import { veranstalterDashboardEventStatusMeta } from "./veranstalterDashboardEventStatusMeta.ts"

/** Live event detail: draft patch form, tier sheet, publish/archive lifecycle. */
export function VeranstalterDashboardEventDetailPage(p: {
  readonly state: VeranstalterDashboardEventDetailState
  readonly orgParam: string | undefined
}) {
  const state = p.state
  return (
    <section aria-labelledby="veranstalter-event-detail" class="flex max-w-3xl flex-col gap-4">
      <Show when={state.detail() === undefined && !state.detailError()}>
        <VeranstalterDashboardLoadingState />
      </Show>
      <Show when={state.detailError()}>
        {(message) => (
          <p role="alert" class="rounded-md border border-input px-3 py-2 text-sm text-content">
            {message()}
          </p>
        )}
      </Show>
      <Show when={state.detail() === undefined && state.detailError()}>
        <EmptyState icon={mdiTicketOutline} title="Veranstaltung nicht gefunden" />
      </Show>

      <Show when={state.detail()}>
        {(event) => (
          <>
            <header class="flex flex-wrap items-start justify-between gap-3">
              <div class="flex flex-col gap-1">
                <h1
                  id="veranstalter-event-detail"
                  class="text-xl font-semibold tracking-tight text-content sm:text-2xl"
                >
                  {event().title}
                </h1>
                <p class="flex items-center gap-1.5 text-sm text-content-muted">
                  <Icon path={veranstalterDashboardEventStatusMeta(event().status).icon} class="size-4" />
                  {veranstalterDashboardEventStatusMeta(event().status).label} · {event().city} · {event().venue}
                </p>
              </div>
              <Show when={state.isPublished()}>
                <Link
                  to="/events/$eventId"
                  params={{ eventId: event().eventKey }}
                  class="rounded-md border border-input px-3 py-1.5 text-sm font-medium text-content"
                >
                  Öffentliche Ansicht
                </Link>
              </Show>
            </header>

            <Show when={state.canReadOrders() || state.canReadParticipants()}>
              <nav aria-label="Bestellungen und Teilnehmer" class="flex flex-wrap gap-4 text-sm">
                <Show when={state.canReadOrders()}>
                  <Link
                    to="/veranstalter/events/$eventKey/bestellungen"
                    params={{ eventKey: event().eventKey }}
                    search={{ org: p.orgParam }}
                    class="underline"
                  >
                    Bestellungen
                  </Link>
                </Show>
                <Show when={state.canReadParticipants()}>
                  <Link
                    to="/veranstalter/events/$eventKey/teilnehmer"
                    params={{ eventKey: event().eventKey }}
                    search={{ org: p.orgParam }}
                    class="underline"
                  >
                    Teilnehmer
                  </Link>
                </Show>
              </nav>
            </Show>

            <Show when={state.failure()}>
              {(message) => (
                <p role="alert" class="rounded-md border border-input px-3 py-2 text-sm text-content">
                  {message()}
                </p>
              )}
            </Show>

            <Show when={state.canEdit() && state.isDraft()}>
              <form
                class="flex flex-col gap-3 rounded-md border border-input p-3"
                onSubmit={(submit) => {
                  submit.preventDefault()
                  void state.patchSave()
                }}
              >
                <h2 class="text-sm font-semibold text-content">Grunddaten (nur Entwurf)</h2>
                <label class="flex flex-col gap-1 text-sm">
                  Titel
                  <Input
                    value={state.dirty().title ?? event().title}
                    onInput={(input) => state.patchFieldChange("title", input.currentTarget.value)}
                  />
                </label>
                <label class="flex flex-col gap-1 text-sm">
                  Beschreibung
                  <Textarea
                    value={state.dirty().description ?? event().description}
                    onInput={(input) => state.patchFieldChange("description", input.currentTarget.value)}
                  />
                </label>
                <div class="grid gap-3 sm:grid-cols-3">
                  <label class="flex flex-col gap-1 text-sm">
                    Beginn (Europe/Berlin)
                    <InputDateTime
                      value={state.dirty().startsAtLocal ?? state.berlinLocal(event().startsAt)}
                      onInput={(value) => state.patchFieldChange("startsAtLocal", value)}
                    />
                  </label>
                  <label class="flex flex-col gap-1 text-sm">
                    Ende (Europe/Berlin)
                    <InputDateTime
                      value={state.dirty().endsAtLocal ?? state.berlinLocal(event().endsAt)}
                      onInput={(value) => state.patchFieldChange("endsAtLocal", value)}
                    />
                  </label>
                  <label class="flex flex-col gap-1 text-sm">
                    Einlass (Europe/Berlin)
                    <InputDateTime
                      value={state.dirty().doorsAtLocal ?? state.berlinLocal(event().doorsAt)}
                      onInput={(value) => state.patchFieldChange("doorsAtLocal", value)}
                    />
                  </label>
                </div>
                <fieldset disabled={state.pending()} class="flex flex-col gap-3 border-t border-input pt-3">
                  <legend class="text-sm font-semibold text-content">FAQ</legend>
                  <p class="text-xs text-content-muted">
                    Bis zu 20 Fragen. Löschen aller Einträge wird beim Speichern übernommen.
                  </p>
                  <Index each={state.faqRows()}>
                    {(row, index) => (
                      <div class="flex flex-col gap-2 rounded-md border border-input p-3">
                        <label class="flex flex-col gap-1 text-sm">
                          Frage {index + 1}
                          <Input
                            value={row().question}
                            maxLength={200}
                            onInput={(input) => state.faqChange(row().id, "question", input.currentTarget.value)}
                          />
                        </label>
                        <label class="flex flex-col gap-1 text-sm">
                          Antwort
                          <Textarea
                            value={row().answer}
                            maxLength={1000}
                            onInput={(input) => state.faqChange(row().id, "answer", input.currentTarget.value)}
                          />
                        </label>
                        <Button type="button" variant="outline" size="sm" onClick={() => state.faqDelete(row().id)}>
                          Frage löschen
                        </Button>
                      </div>
                    )}
                  </Index>
                  <div class="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={state.faqAtLimit()}
                      onClick={() => state.faqAdd()}
                    >
                      Frage hinzufügen
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => state.faqClear()}>
                      Alle Fragen entfernen
                    </Button>
                  </div>
                </fieldset>
                <fieldset disabled={state.pending()} class="flex flex-col gap-3 border-t border-input pt-3">
                  <legend class="text-sm font-semibold text-content">Ablauf (Europe/Berlin)</legend>
                  <p class="text-xs text-content-muted">
                    Bis zu 50 Punkte in Listenreihenfolge. Uhrzeiten im Format HH:mm, Ortszeit Europe/Berlin.
                  </p>
                  <Index each={state.scheduleRows()}>
                    {(row, index) => (
                      <div class="flex flex-col gap-2 rounded-md border border-input p-3">
                        <label class="flex flex-col gap-1 text-sm">
                          Uhrzeit {index + 1} (Europe/Berlin, HH:mm)
                          <Input
                            value={row().time}
                            maxLength={5}
                            placeholder="19:30"
                            onInput={(input) => state.scheduleChange(row().id, "time", input.currentTarget.value)}
                          />
                        </label>
                        <label class="flex flex-col gap-1 text-sm">
                          Programmpunkt
                          <Input
                            value={row().title}
                            maxLength={200}
                            onInput={(input) => state.scheduleChange(row().id, "title", input.currentTarget.value)}
                          />
                        </label>
                        <label class="flex flex-col gap-1 text-sm">
                          Details (optional)
                          <Textarea
                            value={row().detail ?? ""}
                            maxLength={1000}
                            onInput={(input) => state.scheduleChange(row().id, "detail", input.currentTarget.value)}
                          />
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => state.scheduleDelete(row().id)}
                        >
                          Programmpunkt löschen
                        </Button>
                      </div>
                    )}
                  </Index>
                  <div class="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={state.scheduleAtLimit()}
                      onClick={() => state.scheduleAdd()}
                    >
                      Programmpunkt hinzufügen
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => state.scheduleClear()}>
                      Ablauf leeren
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => state.contentReload()}>
                      FAQ und Ablauf neu laden
                    </Button>
                  </div>
                </fieldset>
                <div>
                  <Button type="submit" variant="filled" size="sm" class="h-9 text-sm" disabled={state.pending()}>
                    {state.pending() ? "Speichert …" : "Änderungen speichern"}
                  </Button>
                </div>
              </form>
            </Show>

            <Show when={!state.canEdit() || !state.isDraft()}>
              <section class="flex flex-col gap-2 rounded-md border border-input p-3" aria-label="FAQ und Ablauf">
                <h2 class="text-sm font-semibold text-content">FAQ</h2>
                <For each={event().faqs} fallback={<p class="text-sm text-content-muted">Keine Fragen hinterlegt.</p>}>
                  {(row) => (
                    <div class="text-sm">
                      <p class="font-medium">{row.question}</p>
                      <p class="whitespace-pre-wrap">{row.answer}</p>
                    </div>
                  )}
                </For>
                <h2 class="text-sm font-semibold text-content">Ablauf (Europe/Berlin)</h2>
                <For
                  each={event().schedule}
                  fallback={<p class="text-sm text-content-muted">Kein Ablauf hinterlegt.</p>}
                >
                  {(row) => (
                    <div class="text-sm">
                      <p class="font-medium">
                        {row.time} · {row.title}
                      </p>
                      <p class="whitespace-pre-wrap">{row.detail}</p>
                    </div>
                  )}
                </For>
              </section>
            </Show>

            <div class="flex flex-col gap-2">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h2 class="text-sm font-semibold text-content">Tarife</h2>
                <Show when={state.canManageTiers()}>
                  <Button variant="outline" size="sm" class="h-9 text-sm" onClick={() => state.openTier("neu")}>
                    Neuer Tarif
                  </Button>
                </Show>
              </div>
              <Show when={event().tierOverflow}>
                <p class="text-xs text-content-muted">
                  Weitere Tarife sind vorhanden und werden hier nicht alle gezeigt.
                </p>
              </Show>
              <Show
                when={event().tiers.length > 0}
                fallback={<p class="text-sm text-content-muted">Noch keine Tarife angelegt.</p>}
              >
                <ul class="flex flex-col gap-2">
                  <For each={event().tiers}>
                    {(tier) => (
                      <li class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-input px-3 py-2 text-sm">
                        <div class="flex flex-col">
                          <span class="font-medium text-content">{tier.name}</span>
                          <Show when={tier.archivedAt !== undefined}>
                            <span class="flex items-center gap-1 text-xs text-content-muted">
                              <Icon path={mdiArchiveOutline} class="size-3" /> Archiviert
                            </span>
                          </Show>
                          <span class="text-xs text-content-muted">
                            {tier.sold} verkauft · {tier.available} verfügbar · Kapazität {tier.capacity} ·{" "}
                            <span class="tabular-nums">{state.tierPriceLabel(tier.priceCents)}</span>
                          </span>
                        </div>
                        <Show when={state.canManageTiers() && tier.archivedAt === undefined}>
                          <Button
                            variant="outline"
                            size="sm"
                            class="h-9 text-sm"
                            onClick={() => state.openTier(tier.tierKey)}
                          >
                            Bearbeiten
                          </Button>
                        </Show>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </div>

            <Show when={state.canEdit()}>
              <div class="flex flex-wrap gap-2">
                <Show when={state.isDraft()}>
                  <Button
                    variant="filled"
                    size="sm"
                    class="h-9 text-sm"
                    onClick={() => void state.publish()}
                    disabled={state.pending()}
                  >
                    {state.pending() ? "Veröffentlicht …" : "Veröffentlichen"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-9 text-sm"
                    onClick={() => state.requestEventArchive()}
                    disabled={state.pending()}
                  >
                    Archivieren
                  </Button>
                </Show>
                <Show when={state.isPublished()}>
                  <p class="rounded-md border border-input px-3 py-2 text-sm text-content-muted">
                    Veröffentlichte Veranstaltungen können derzeit nicht archiviert werden — die sichere Stornierung
                    laufender Verkäufe wird noch serverseitig abgesichert.
                  </p>
                </Show>
              </div>
            </Show>

            <ConfirmDialog
              open={state.confirmKind() === "veranstaltung-archiv"}
              onOpenChange={(open) => {
                if (!open) state.dismissConfirm()
              }}
              title={`„${event().title}“ archivieren?`}
              description="Der Entwurf wird archiviert und ist danach nicht mehr bearbeitbar."
              consequences={[
                {
                  icon: mdiAlertOutline,
                  tone: "warning",
                  text: "Der Entwurf verschwindet aus den Veranstaltungslisten.",
                },
                {
                  icon: mdiAlertOutline,
                  tone: "danger",
                  text: "Archivierte Veranstaltungen können nicht erneut veröffentlicht werden.",
                },
              ]}
              confirmLabel="Archivieren"
              cancelLabel="Abbrechen"
              tone="danger"
              requireText={event().title}
              onConfirm={() => state.confirmEventArchive()}
            />

            <Sheet
              open={state.sheetOpen()}
              onOpenChange={(open) => {
                if (!open) state.closeTier()
              }}
              title={state.sheetIsNew() ? "Neuer Tarif" : "Tarif bearbeiten"}
              description="Der Gebührenanteil wird serverseitig berechnet."
            >
              <Show
                when={state.canManageTiers()}
                fallback={
                  <p class="text-sm text-content-muted">
                    Tarife sind schreibgeschützt: Ohne das Recht „Tarife bearbeiten“ lassen sich keine Tarife anlegen
                    oder ändern.
                  </p>
                }
              >
                <form
                  class="flex flex-col gap-3"
                  onSubmit={(submit) => {
                    submit.preventDefault()
                    void state.tierSave()
                  }}
                >
                  <label class="flex flex-col gap-1 text-sm">
                    Tarifname
                    <Input
                      value={state.tierDraft().name}
                      onInput={(input) => state.tierFieldChange("name", input.currentTarget.value)}
                      required
                    />
                  </label>
                  <label class="flex flex-col gap-1 text-sm">
                    Beschreibung
                    <Textarea
                      value={state.tierDraft().description}
                      onInput={(input) => state.tierFieldChange("description", input.currentTarget.value)}
                    />
                  </label>
                  <label class="flex flex-col gap-1 text-sm">
                    Preis in Euro
                    <Input
                      inputMode="decimal"
                      value={state.tierDraft().priceEuros}
                      onInput={(input) => state.tierFieldChange("priceEuros", input.currentTarget.value)}
                      required
                    />
                  </label>
                  <label class="flex flex-col gap-1 text-sm">
                    Kapazität
                    <Input
                      inputMode="numeric"
                      value={state.tierDraft().capacity}
                      onInput={(input) => state.tierFieldChange("capacity", input.currentTarget.value)}
                      required
                    />
                  </label>
                  <div class="flex flex-wrap gap-2">
                    <Button type="submit" variant="filled" size="sm" class="h-9 text-sm" disabled={state.pending()}>
                      {state.pending() ? "Speichert …" : "Tarif speichern"}
                    </Button>
                    <Show when={!state.sheetIsNew()}>
                      <Button
                        variant="outline"
                        size="sm"
                        class="h-9 text-sm"
                        onClick={() => state.requestTierArchive()}
                        disabled={state.pending()}
                      >
                        Archivieren
                      </Button>
                    </Show>
                  </div>
                </form>
              </Show>

              <ConfirmDialog
                nested
                open={state.confirmKind() === "tarif-archiv" && state.sheetOpen()}
                onOpenChange={(open) => {
                  if (!open) state.dismissConfirm()
                }}
                title={`Tarif „${state.sheetTier()?.name ?? ""}“ archivieren?`}
                description="Der Tarif wird archiviert und ist danach nicht mehr buchbar."
                consequences={[
                  {
                    icon: mdiAlertOutline,
                    tone: "danger",
                    text: "Tarife mit aktiven Reservierungen lassen sich nicht archivieren.",
                  },
                ]}
                confirmLabel="Archivieren"
                cancelLabel="Abbrechen"
                tone="danger"
                requireText={state.sheetTier()?.name}
                onConfirm={() => state.confirmTierArchive()}
              />
            </Sheet>
          </>
        )}
      </Show>
    </section>
  )
}
