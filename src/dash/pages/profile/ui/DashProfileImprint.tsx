import { Input } from "#ui/input/input/Input.jsx"
import type { DashProfileImprintForm } from "../dashProfilePageStateCreate.ts"
import type { DashProfilePageState } from "../dashProfilePageStateCreate.ts"
import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"

const imprintFields: ReadonlyArray<{
  key: keyof DashProfileImprintForm
  label: string
  id: string
  placeholder: string
  required: boolean
  span: boolean
}> = [
  {
    key: "legalName",
    label: "Firmen- bzw. Vereinsname",
    id: "dash-profile-legal-name",
    placeholder: "Kulturhaus Lindenhof e.V.",
    required: true,
    span: true,
  },
  {
    key: "street",
    label: "Straße und Hausnummer",
    id: "dash-profile-street",
    placeholder: "Lindenhofstraße 12",
    required: true,
    span: false,
  },
  { key: "zip", label: "Postleitzahl", id: "dash-profile-zip", placeholder: "04109", required: true, span: false },
  { key: "city", label: "Ort", id: "dash-profile-city", placeholder: "Leipzig", required: true, span: false },
  {
    key: "representative",
    label: "Vertreten durch",
    id: "dash-profile-representative",
    placeholder: "Mara Lindner (1. Vorsitzende)",
    required: true,
    span: true,
  },
  {
    key: "register",
    label: "Registereintrag",
    id: "dash-profile-register",
    placeholder: "Vereinsregister VR 4711",
    required: false,
    span: false,
  },
  {
    key: "vatId",
    label: "USt-ID",
    id: "dash-profile-vat-id",
    placeholder: "DE312471100",
    required: false,
    span: false,
  },
]

/** Profil-Sektion: Anbieterangaben für das Impressum. */
export function DashProfileImprint(p: { state: DashProfilePageState; disabled: boolean }) {
  const errors = () => p.state.liveErrors()
  const value = (key: keyof DashProfileImprintForm) => p.state.form.get()?.imprint[key] ?? ""
  return (
    <DashSection
      title="Anbieterangaben"
      description="Dein Impressum auf dem öffentlichen Profil und auf der Eventseite."
    >
      <div class="grid gap-5 sm:grid-cols-2">
        {imprintFields.map((field) => (
          <div class={field.span ? "sm:col-span-2" : ""}>
            <DashField
              label={field.label}
              for={field.id}
              required={field.required}
              error={errors()[`imprint.${field.key}`]}
              info={field.required ? "Erscheinen im Impressum deines Profils." : undefined}
            >
              <Input
                id={field.id}
                value={value(field.key)}
                placeholder={field.placeholder}
                maxlength={120}
                disabled={p.disabled}
                aria-invalid={errors()[`imprint.${field.key}`] ? "true" : undefined}
                onInput={(event) => p.state.setImprint(field.key, event.currentTarget.value)}
              />
            </DashField>
          </div>
        ))}
      </div>
    </DashSection>
  )
}
