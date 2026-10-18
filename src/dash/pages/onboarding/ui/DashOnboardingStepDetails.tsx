import { Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { SegmentedControl } from "#ui/input/segmented/SegmentedControl.jsx"

import type { DashOnboardingPageState } from "../dashOnboardingPageStateCreate.ts"
import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"

/** Schritt 3 „Angaben“: Impressum, Steuerstatus und Bankverbindung. */
export function DashOnboardingStepDetails(p: { state: DashOnboardingPageState }) {
  const state = p.state
  const errors = () => (state.showErrors.get() ? state.errors() : {})

  return (
    <div class="flex flex-col gap-4">
      <DashSection title="Anbieterangaben" description="Diese Angaben stehen in deinem Impressum.">
        <div class="flex flex-col gap-4">
          <DashField label="Name (Impressum)" for="onboarding-legalname" required error={errors().legalName}>
            <Input
              id="onboarding-legalname"
              class="h-10 text-sm"
              value={state.legalName.get()}
              onInput={(event) => state.set(state.legalName, event.currentTarget.value)}
              placeholder="z. B. Tanzschule Rhythmus GmbH"
            />
          </DashField>
          <DashField label="Straße und Hausnummer" for="onboarding-street" required error={errors().street}>
            <Input
              id="onboarding-street"
              class="h-10 text-sm"
              value={state.street.get()}
              onInput={(event) => state.set(state.street, event.currentTarget.value)}
              placeholder="Musterstraße 12"
            />
          </DashField>
          <div class="grid grid-cols-[110px_minmax(0,1fr)] gap-4">
            <DashField label="PLZ" for="onboarding-zip" required error={errors().zip}>
              <Input
                id="onboarding-zip"
                class="h-10 text-sm"
                inputmode="numeric"
                value={state.zip.get()}
                onInput={(event) => state.set(state.zip, event.currentTarget.value)}
                placeholder="04109"
              />
            </DashField>
            <DashField label="Ort" for="onboarding-city" required error={errors().city}>
              <Input
                id="onboarding-city"
                class="h-10 text-sm"
                value={state.city.get()}
                onInput={(event) => state.set(state.city, event.currentTarget.value)}
                placeholder="Leipzig"
              />
            </DashField>
          </div>
          <DashField
            label="Vertretung"
            for="onboarding-representative"
            required
            error={errors().representative}
            hint="Wer vertritt dich nach außen?"
          >
            <Input
              id="onboarding-representative"
              class="h-10 text-sm"
              value={state.representative.get()}
              onInput={(event) => state.set(state.representative, event.currentTarget.value)}
              placeholder="z. B. Ruth Rhythmus (Geschäftsführerin)"
            />
          </DashField>
          <Show when={state.kind.get() !== "privat"}>
            <DashField
              label="Register"
              for="onboarding-register"
              required
              error={errors().register}
              hint="Verein, Handelsregister oder Schule – je nach Art."
            >
              <Input
                id="onboarding-register"
                class="h-10 text-sm"
                value={state.register.get()}
                onInput={(event) => state.set(state.register, event.currentTarget.value)}
                placeholder="z. B. HRB 4711, Amtsgericht Leipzig"
              />
            </DashField>
          </Show>
          <DashField label="USt-ID" for="onboarding-vatid" hint="Optional – entfällt bei Kleinunternehmern meist.">
            <Input
              id="onboarding-vatid"
              class="h-10 text-sm"
              value={state.vatId.get()}
              onInput={(event) => state.set(state.vatId, event.currentTarget.value)}
              placeholder="z. B. DE123456789"
            />
          </DashField>
        </div>
      </DashSection>

      <DashSection title="Steuern" description="Dein Steuerstatus gilt für alle Ticketpreise.">
        <DashField
          label="Steuerstatus"
          info="Als Kleinunternehmer nach § 19 UStG weist du keine Umsatzsteuer aus. Wähl im Zweifel Regelbesteuerung."
          error={undefined}
        >
          <SegmentedControl
            value={state.taxStatus.get()}
            onChange={(value) => state.set(state.taxStatus, value as "regel" | "klein")}
            ariaLabel="Steuerstatus wählen"
            options={[
              { value: "regel", label: "Regelbesteuerung" },
              { value: "klein", label: "Kleinunternehmer (§ 19)" },
            ]}
          />
        </DashField>
      </DashSection>

      <DashSection title="Auszahlung" description="Wohin dürfen wir deine Ticketeinnahmen überweisen?">
        <div class="flex flex-col gap-4">
          <DashField label="Kontoinhaber" for="onboarding-holder" required error={errors().holder}>
            <Input
              id="onboarding-holder"
              class="h-10 text-sm"
              value={state.holder.get()}
              onInput={(event) => state.set(state.holder, event.currentTarget.value)}
              placeholder="z. B. Tanzschule Rhythmus GmbH"
            />
          </DashField>
          <DashField label="IBAN" for="onboarding-iban" required error={errors().iban}>
            <Input
              id="onboarding-iban"
              class="h-10 text-sm"
              inputmode="text"
              autocomplete="off"
              spellcheck={false}
              value={state.iban.get()}
              onInput={(event) => state.set(state.iban, event.currentTarget.value.toUpperCase())}
              onBlur={state.formatIban}
              placeholder="DE00 0000 0000 0000 0000 00"
            />
          </DashField>
        </div>
      </DashSection>
    </div>
  )
}
