import { mdiDomainPlus } from "@adaptive-ds/mdi/mdiDomainPlus.js"
import { OrganizerContractLinks } from "../../../contracts/OrganizerContractLinks.tsx"
import { OrganizerPricingSummary } from "../../../contracts/OrganizerPricingSummary.tsx"
import { Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { Checkbox } from "#ui/input/check/Checkbox.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { LabelAsterix } from "#ui/input/label/LabelAsterix.jsx"
import { SelectSingleNative } from "#ui/input/select/SelectSingleNative.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { veranstalterOnboardingPageStateCreate } from "./veranstalterOnboardingPageStateCreate.ts"

const kindOptions = ["verein", "unternehmen", "schule", "privat"]

const kindLabels: Record<string, string> = {
  verein: "Verein",
  unternehmen: "Unternehmen",
  schule: "Schule",
  privat: "Privatperson",
}

/** Registration of an existing legal party; this does not incorporate a company or association. */
export function VeranstalterOnboardingPage() {
  const state = veranstalterOnboardingPageStateCreate()
  return (
    <div class="flex flex-col gap-4">
      <div>
        <h1 class="text-xl font-semibold text-content">Veranstalter registrieren</h1>
        <p class="mt-1 text-sm text-content-muted">
          Lege dein Veranstalterkonto an. Du gründest damit keine Firma und keinen Verein. Die Registrierung selbst
          kostet nichts; Gebühren entstehen erst beim Verkauf kostenpflichtiger Tickets.
        </p>
      </div>
      <Show when={state.createdSlug.get()}>
        {(slug) => (
          <CardWrapper class="rounded-card border-border-subtle shadow-none">
            <EmptyState
              icon={mdiDomainPlus}
              title="Veranstalterkonto angelegt"
              description={`„${slug()}“ wurde zur Prüfung eingereicht. Vor dem Ticketverkauf prüfen wir Vertragspartner, Bankverbindung, Steuerangaben und Zahlungsanbindung. Bis zur Freischaltung ist kein Verkauf möglich. Deine Vertragsbestätigung wird an die angegebene E-Mail-Adresse versendet.`}
              actions={
                <LinkButtonInternal to="/veranstalter" search={state.successSearch()} variant={buttonVariant.contrast}>
                  Zum Dashboard
                </LinkButtonInternal>
              }
            />
          </CardWrapper>
        )}
      </Show>
      <Show when={state.createdSlug.get() === null}>
        <CardWrapper class="rounded-card border-border-subtle shadow-none">
          <form
            class="flex flex-col gap-4 p-4 sm:p-6"
            onSubmit={(event) => {
              event.preventDefault()
              void state.submit()
            }}
          >
            <fieldset class="flex flex-col gap-4" disabled={state.submitting.get()}>
              <legend class="mb-3 text-lg font-semibold">1. Veranstalterprofil</legend>
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="flex flex-col gap-1.5">
                  <Label for="onboarding-name">
                    Öffentlicher Veranstaltername
                    <LabelAsterix />
                  </Label>
                  <Input
                    id="onboarding-name"
                    value={state.name.get()}
                    onInput={(event) => state.name.set(event.currentTarget.value)}
                    autocomplete="organization"
                    required
                  />
                </div>
                <div class="flex flex-col gap-1.5">
                  <Label for="onboarding-slug">
                    Kurzadresse
                    <LabelAsterix />
                  </Label>
                  <Input
                    id="onboarding-slug"
                    value={state.slug.get()}
                    onInput={(event) => state.slug.set(event.currentTarget.value)}
                    autocomplete="off"
                    required
                  />
                  <p class="text-xs text-content-muted">
                    Mindestens 3 Zeichen; Kleinbuchstaben, Zahlen und Bindestriche. Nachträglich nicht änderbar.
                  </p>
                </div>
                <div class="flex flex-col gap-1.5">
                  <Label for="onboarding-kind">
                    Organisationsart
                    <LabelAsterix />
                  </Label>
                  <SelectSingleNative
                    id="onboarding-kind"
                    valueSignal={{
                      get: state.kind.get,
                      set: (value: string) => state.kind.set(value as "verein" | "unternehmen" | "schule" | "privat"),
                    }}
                    getOptions={() => kindOptions}
                    valueText={(value) => kindLabels[value] ?? value}
                  />
                </div>
                <div class="flex flex-col gap-1.5">
                  <Label for="onboarding-email">
                    Vertrags- und Kontakt-E-Mail
                    <LabelAsterix />
                  </Label>
                  <Input
                    id="onboarding-email"
                    type="email"
                    value={state.contactEmail.get()}
                    onInput={(event) => state.contactEmail.set(event.currentTarget.value)}
                    autocomplete="email"
                    required
                  />
                </div>
                <div class="flex flex-col gap-1.5">
                  <Label for="onboarding-phone">Telefon (optional)</Label>
                  <Input
                    id="onboarding-phone"
                    type="tel"
                    value={state.contactPhone.get()}
                    onInput={(event) => state.contactPhone.set(event.currentTarget.value)}
                    autocomplete="tel"
                  />
                </div>
                <div class="flex flex-col gap-1.5 sm:col-span-2">
                  <Label for="onboarding-imprint">Öffentliches Veranstalter-Impressum (soweit erforderlich)</Label>
                  <Textarea
                    id="onboarding-imprint"
                    value={state.imprint.get()}
                    onInput={(event) => state.imprint.set(event.currentTarget.value)}
                  />
                  <p class="text-xs text-content-muted">
                    Bei Unternehmen und Vereinen einschließlich Rechtsform, Vertretung und Registerangaben, soweit
                    vorhanden. Kann vor Freischaltung ergänzt werden.
                  </p>
                </div>
              </div>
            </fieldset>
            <fieldset class="flex flex-col gap-4" disabled={state.submitting.get()}>
              <legend class="mb-3 text-lg font-semibold">2. Vertragspartner</legend>
              <p class="text-sm text-content-muted">
                Vertragspartner von Eventoren ist die hier genannte Person oder Organisation, nicht lediglich der
                öffentliche Profilname. Eventoren ist ein Angebot der Semesterkur UG (haftungsbeschränkt).
              </p>
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="flex flex-col gap-1.5 sm:col-span-2">
                  <Label for="onboarding-customer-type">
                    In welcher Eigenschaft handelst du?
                    <LabelAsterix />
                  </Label>
                  <SelectSingleNative
                    id="onboarding-customer-type"
                    valueSignal={{
                      get: state.customerType.get,
                      set: (value: string) => state.customerType.set(value === "consumer" ? "consumer" : "business"),
                    }}
                    getOptions={() => ["business", "consumer"] as const}
                    valueText={(value) =>
                      value === "consumer"
                        ? "Privat – als Verbraucher/in"
                        : "Geschäftlich, beruflich oder für eine öffentliche Einrichtung"
                    }
                  />
                  <p class="text-xs text-content-muted">
                    Entscheidend ist der tatsächliche Vertragszweck. Ein Verein ist nicht automatisch Unternehmer; eine
                    rein private Veranstaltung kann unter das Verbraucherrecht fallen.
                  </p>
                </div>
                <div class="flex flex-col gap-1.5 sm:col-span-2">
                  <Label for="onboarding-legal-name">
                    Vollständiger rechtlicher Name
                    <LabelAsterix />
                  </Label>
                  <Input
                    id="onboarding-legal-name"
                    value={state.legalName.get()}
                    onInput={(event) => state.legalName.set(event.currentTarget.value)}
                    required
                    maxlength={200}
                    autocomplete="organization"
                  />
                  <p class="text-xs text-content-muted">
                    Firma bzw. Verein einschließlich Rechtsform; bei Privatpersonen vollständiger Vor- und Nachname. Für
                    eine Schule bitte den rechtlich verantwortlichen Träger angeben.
                  </p>
                </div>
                <div class="flex flex-col gap-1.5 sm:col-span-2">
                  <Label for="onboarding-representative">
                    Dein vollständiger Name als abschließende Person
                    <LabelAsterix />
                  </Label>
                  <Input
                    id="onboarding-representative"
                    value={state.representativeName.get()}
                    onInput={(event) => state.representativeName.set(event.currentTarget.value)}
                    required
                    maxlength={200}
                    autocomplete="name"
                  />
                </div>
                <div class="flex flex-col gap-1.5 sm:col-span-2">
                  <Label for="onboarding-address">
                    Straße und Hausnummer
                    <LabelAsterix />
                  </Label>
                  <Input
                    id="onboarding-address"
                    value={state.streetAddress.get()}
                    onInput={(event) => state.streetAddress.set(event.currentTarget.value)}
                    required
                    autocomplete="street-address"
                  />
                </div>
                <div class="flex flex-col gap-1.5">
                  <Label for="onboarding-postal">
                    Postleitzahl
                    <LabelAsterix />
                  </Label>
                  <Input
                    id="onboarding-postal"
                    value={state.postalCode.get()}
                    onInput={(event) => state.postalCode.set(event.currentTarget.value)}
                    required
                    autocomplete="postal-code"
                  />
                </div>
                <div class="flex flex-col gap-1.5">
                  <Label for="onboarding-city">
                    Ort
                    <LabelAsterix />
                  </Label>
                  <Input
                    id="onboarding-city"
                    value={state.city.get()}
                    onInput={(event) => state.city.set(event.currentTarget.value)}
                    required
                    autocomplete="address-level2"
                  />
                </div>
                <div class="flex flex-col gap-1.5">
                  <Label for="onboarding-country">
                    Ländercode
                    <LabelAsterix />
                  </Label>
                  <Input
                    id="onboarding-country"
                    value={state.countryCode.get()}
                    onInput={(event) => state.countryCode.set(event.currentTarget.value)}
                    required
                    minlength={2}
                    maxlength={2}
                    autocomplete="country"
                    aria-describedby="onboarding-country-help"
                  />
                  <p id="onboarding-country-help" class="text-xs text-content-muted">
                    Zum Beispiel DE für Deutschland oder AT für Österreich.
                  </p>
                </div>
              </div>
            </fieldset>
            <fieldset class="flex flex-col gap-4" disabled={state.submitting.get()}>
              <legend class="mb-3 text-lg font-semibold">3. Auszahlung und Kosten</legend>
              <p class="text-sm text-content-muted">
                Bankdaten sind jetzt optional, für die spätere Freischaltung aber erforderlich. Gib nur ein berechtigt
                genutztes Auszahlungskonto an. Steuerstatus und Ticketsteuersätze prüfen wir vor Verkaufsstart mit dir –
                sie werden nicht aus deiner Organisationsart abgeleitet.
              </p>
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="flex flex-col gap-1.5">
                  <Label for="onboarding-holder">Kontoinhaber (optional)</Label>
                  <Input
                    id="onboarding-holder"
                    value={state.bankHolder.get()}
                    onInput={(event) => state.bankHolder.set(event.currentTarget.value)}
                    autocomplete="off"
                  />
                </div>
                <div class="flex flex-col gap-1.5">
                  <Label for="onboarding-iban">IBAN (optional)</Label>
                  <Input
                    id="onboarding-iban"
                    value={state.iban.get()}
                    onInput={(event) => state.iban.set(event.currentTarget.value)}
                    autocomplete="off"
                    spellcheck={false}
                  />
                </div>
                <div class="flex flex-col gap-1.5 sm:col-span-2">
                  <Label for="onboarding-fee-payer">
                    Wer trägt die Eventoren-Gebühr?
                    <LabelAsterix />
                  </Label>
                  <SelectSingleNative
                    id="onboarding-fee-payer"
                    valueSignal={{
                      get: state.feePayer.get,
                      set: (value: string) => state.feePayer.set(value === "veranstalter" ? "veranstalter" : "kaeufer"),
                    }}
                    getOptions={() => ["kaeufer", "veranstalter"] as const}
                    valueText={(value) =>
                      value === "kaeufer"
                        ? "Käufer – im ausgewiesenen Gesamtpreis zusätzlich zum Ticketpreis"
                        : "Veranstalter – Abzug von meinem Ticketumsatz"
                    }
                  />
                </div>
              </div>
              <OrganizerPricingSummary payer={state.feePayer.get()} />
              <p class="text-sm text-content-muted">
                Auszahlungen erfolgen nach der Veranstaltung gemäß Vertrag. Kostenpflichtiger Verkauf setzt eine
                freigegebene Zahlungsanbindung voraus; die Registrierung allein richtet diese nicht ein.
              </p>
            </fieldset>
            <Show when={state.validationError() !== null}>
              <p
                role="alert"
                class="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger dark:bg-red-950/60 dark:text-red-300"
              >
                {state.validationError()}
              </p>
            </Show>
            <h2 class="text-lg font-semibold">4. Prüfen und Vertrag abschließen</h2>
            <p class="text-sm">
              Bitte prüfe deine Angaben und die Kostenaufteilung oben. Änderungen sind bis zum Absenden möglich.
              Vertragssprache ist Deutsch. Die angenommenen Texte, Parteien und Konditionen werden versioniert
              gespeichert und als Bestätigung per E-Mail versendet.
            </p>
            <OrganizerContractLinks />
            <fieldset class="flex flex-col gap-2 rounded-xl bg-warning-soft px-4 py-3 dark:bg-amber-950/60">
              <legend class="px-1 text-sm font-semibold text-warning dark:text-amber-300">
                Deine ausdrückliche Zustimmung
              </legend>
              <Checkbox
                id="onboarding-terms-accept"
                checked={state.termsAccepted.get()}
                onChange={state.termsAccepted.set}
              >
                Ich stimme dem verlinkten Veranstaltervertrag einschließlich Preis- und Leistungsblatt und der oben
                gewählten Kostenaufteilung zu.
              </Checkbox>
              <Checkbox id="onboarding-dpa-accept" checked={state.dpaAccepted.get()} onChange={state.dpaAccepted.set}>
                Ich stimme der oben verlinkten AVV in der angegebenen Revision für meine Organisation zu.
              </Checkbox>
              <Checkbox
                id="onboarding-authority"
                checked={state.authorityConfirmed.get()}
                onChange={state.authorityConfirmed.set}
              >
                Ich bin volljährig und schließe für mich selbst ab oder bin berechtigt, den angegebenen Vertragspartner
                zu vertreten. Die Angaben zum Vertragspartner und zur geschäftlichen bzw. privaten Nutzung sind
                zutreffend.
              </Checkbox>
            </fieldset>
            <Show when={state.customerType.get() === "consumer"}>
              <fieldset class="flex flex-col gap-3 rounded-control border border-border-subtle p-4">
                <legend class="px-1 font-semibold">Dein Widerrufsrecht als Verbraucher/in</legend>
                <p class="text-sm">
                  Du hast grundsätzlich 14 Tage Widerrufsrecht für diesen Plattformvertrag. Die vollständige Belehrung
                  und das Muster-Widerrufsformular stehen im Veranstaltervertrag. Ohne den folgenden freiwilligen Wunsch
                  beginnt die Leistung erst nach Ablauf dieser Frist und nach Freischaltung.
                </p>
                <Checkbox
                  id="onboarding-early-service"
                  checked={state.earlyServiceStartRequested.get()}
                  onChange={state.earlyServiceStartRequested.set}
                >
                  Ich verlange ausdrücklich, dass Eventoren nach Freischaltung schon vor Ablauf der Widerrufsfrist mit
                  der Leistung beginnt. Bei Widerruf kann unter den gesetzlichen Voraussetzungen Wertersatz für bereits
                  erbrachte Leistungen anfallen. Mein Widerrufsrecht erlischt nicht schon durch Registrierung,
                  Freischaltung oder einen Ticketverkauf.
                </Checkbox>
              </fieldset>
            </Show>
            <Show when={state.submissionAttempted.get() && state.blockerMessage()}>
              {(message) => (
                <p
                  role="status"
                  class="rounded-control border border-border-subtle bg-surface-muted p-3 text-sm text-content-muted"
                >
                  {message()}
                </p>
              )}
            </Show>
            <Show when={state.serverError.get()}>
              {(message) => (
                <p
                  role="alert"
                  class="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger dark:bg-red-950/60 dark:text-red-300"
                >
                  {message()}
                </p>
              )}
            </Show>
            <div>
              <Button type="submit" variant="contrast" disabled={!state.canSubmit()}>
                {state.submitting.get() ? "Wird abgeschlossen …" : "Zahlungspflichtigen Vertrag abschließen"}
              </Button>
              <p class="mt-2 text-xs text-content-muted">
                Keine Zahlung bei Registrierung. Kosten entstehen erst bei kostenpflichtigen Ticketverkäufen. Angaben
                werden auf diesem Gerät als Entwurf gespeichert; Zustimmungen nicht.
              </p>
            </div>
          </form>
        </CardWrapper>
      </Show>
    </div>
  )
}
