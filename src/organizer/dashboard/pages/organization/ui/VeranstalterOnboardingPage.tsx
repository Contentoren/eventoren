import { mdiDomainPlus } from "@adaptive-ds/mdi/mdiDomainPlus.js"
import { OrganizerContractLinks } from "../../../contracts/OrganizerContractLinks.tsx"
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

/** Owner onboarding: technical organisation form with an honest contract prerequisite gate. */
export function VeranstalterOnboardingPage() {
  const state = veranstalterOnboardingPageStateCreate()
  return (
    <div class="flex flex-col gap-4">
      <div>
        <h1 class="text-xl font-semibold text-content">Organisation gründen</h1>
        <p class="mt-1 text-sm text-content-muted">
          Neue Veranstalter-Organisation mit ausdrücklicher Zustimmung zu den Vertragsmustern einreichen. MUSTER — keine
          Rechtsberatung, nicht anwaltlich geprüft.
        </p>
      </div>
      <Show when={state.createdSlug.get()}>
        {(slug) => (
          <CardWrapper>
            <EmptyState
              icon={mdiDomainPlus}
              title="Organisation eingereicht"
              description={`Die Organisation „${slug()}” wurde zur Prüfung eingereicht.`}
              actions={
                <LinkButtonInternal to="/veranstalter" search={state.successSearch()} variant={buttonVariant.contrast}>
                  Zum Dashboard
                </LinkButtonInternal>
              }
            />
          </CardWrapper>
        )}
      </Show>
      <CardWrapper>
        <form
          class="flex flex-col gap-4 p-4 sm:p-6"
          onSubmit={(event) => {
            event.preventDefault()
            void state.submit()
          }}
        >
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1.5">
              <Label for="onboarding-name">
                Name
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
                Kurzname (URL)
                <LabelAsterix />
              </Label>
              <Input
                id="onboarding-slug"
                value={state.slug.get()}
                onInput={(event) => state.slug.set(event.currentTarget.value)}
                autocomplete="off"
                required
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="onboarding-kind">
                Art
                <LabelAsterix />
              </Label>
              <SelectSingleNative
                id="onboarding-kind"
                valueSignal={state.kind}
                getOptions={() => kindOptions}
                valueText={(value) => kindLabels[value] ?? value}
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="onboarding-email">Kontakt-E-Mail</Label>
              <Input
                id="onboarding-email"
                type="email"
                value={state.contactEmail.get()}
                onInput={(event) => state.contactEmail.set(event.currentTarget.value)}
                autocomplete="email"
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="onboarding-phone">Kontakt-Telefon</Label>
              <Input
                id="onboarding-phone"
                type="tel"
                value={state.contactPhone.get()}
                onInput={(event) => state.contactPhone.set(event.currentTarget.value)}
                autocomplete="tel"
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="onboarding-holder">Kontoinhaber</Label>
              <Input
                id="onboarding-holder"
                value={state.bankHolder.get()}
                onInput={(event) => state.bankHolder.set(event.currentTarget.value)}
                autocomplete="off"
              />
            </div>
            <div class="flex flex-col gap-1.5 sm:col-span-2">
              <Label for="onboarding-iban">IBAN</Label>
              <Input
                id="onboarding-iban"
                value={state.iban.get()}
                onInput={(event) => state.iban.set(event.currentTarget.value)}
                autocomplete="off"
                inputmode="text"
                spellcheck={false}
              />
            </div>
            <div class="flex flex-col gap-1.5 sm:col-span-2">
              <Label for="onboarding-imprint">Impressum</Label>
              <Textarea
                id="onboarding-imprint"
                value={state.imprint.get()}
                onInput={(event) => state.imprint.set(event.currentTarget.value)}
              />
            </div>
          </div>
          <Show when={state.validationError() !== null}>
            <p role="alert" class="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
              {state.validationError()}
            </p>
          </Show>
          <OrganizerContractLinks />
          <fieldset class="flex flex-col gap-2 rounded-xl bg-warning-soft px-4 py-3">
            <legend class="px-1 text-sm font-semibold text-warning">Ausdrückliche Zustimmung zu Vertragsmustern</legend>
            <Checkbox checked={state.termsAccepted.get()} onChange={state.termsAccepted.set}>
              Ich stimme den oben verlinkten Muster-Veranstalter-AGB in der angegebenen Revision für meine Organisation
              zu.
            </Checkbox>
            <Checkbox checked={state.dpaAccepted.get()} onChange={state.dpaAccepted.set}>
              Ich stimme der oben verlinkten Muster-AVV in der angegebenen Revision für meine Organisation zu.
            </Checkbox>
          </fieldset>
          <Show when={state.blockerMessage()}>
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
              <p role="alert" class="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
                {message()}
              </p>
            )}
          </Show>
          <div>
            <Button type="submit" variant="contrast" disabled={!state.canSubmit()}>
              {state.submitting.get() ? "Wird eingereicht …" : "Organisation einreichen"}
            </Button>
          </div>
        </form>
      </CardWrapper>
    </div>
  )
}
