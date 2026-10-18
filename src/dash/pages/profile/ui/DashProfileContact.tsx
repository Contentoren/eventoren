import { Input } from "#ui/input/input/Input.jsx"
import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import type { DashProfilePageState } from "../dashProfilePageStateCreate.ts"

/** Profil-Sektion: Website, Kontakt-E-Mail und Telefon. */
export function DashProfileContact(p: { state: DashProfilePageState; disabled: boolean }) {
  const form = () => p.state.form.get()
  const errors = () => p.state.liveErrors()
  return (
    <DashSection title="Kontakt" description="Wie erreichen dich deine Gäste?">
      <div class="grid gap-5 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <DashField label="Website" for="dash-profile-website" error={errors()["website"]}>
            <Input
              id="dash-profile-website"
              type="url"
              inputmode="url"
              value={form()?.website ?? ""}
              placeholder="https://dein-verein.de"
              maxlength={200}
              disabled={p.disabled}
              aria-invalid={errors()["website"] ? "true" : undefined}
              onInput={(event) => p.state.setText("website", event.currentTarget.value)}
            />
          </DashField>
        </div>
        <DashField label="E-Mail" for="dash-profile-email" error={errors()["email"]}>
          <Input
            id="dash-profile-email"
            type="email"
            inputmode="email"
            value={form()?.email ?? ""}
            placeholder="hallo@dein-verein.de"
            maxlength={120}
            disabled={p.disabled}
            aria-invalid={errors()["email"] ? "true" : undefined}
            onInput={(event) => p.state.setText("email", event.currentTarget.value)}
          />
        </DashField>
        <DashField label="Telefon" for="dash-profile-phone" error={errors()["phone"]}>
          <Input
            id="dash-profile-phone"
            type="tel"
            inputmode="tel"
            value={form()?.phone ?? ""}
            placeholder="+49 341 47110"
            maxlength={40}
            disabled={p.disabled}
            aria-invalid={errors()["phone"] ? "true" : undefined}
            onInput={(event) => p.state.setText("phone", event.currentTarget.value)}
          />
        </DashField>
      </div>
    </DashSection>
  )
}
