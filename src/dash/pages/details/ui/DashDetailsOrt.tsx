import { mdiMapMarkerOutline } from "@adaptive-ds/mdi/mdiMapMarkerOutline.js"
import { mdiOpenInNew } from "@adaptive-ds/mdi/mdiOpenInNew.js"
import { Input } from "#ui/input/input/Input.jsx"
import { LinkButtonExternal } from "#ui/interactive/link/LinkButton.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { Icon } from "#ui/static/icon/Icon.jsx"

import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import type { DashDetailsPageState } from "../dashDetailsPageStateCreate.ts"

/** Sektion „Ort“: Name, Adresse und Link zur Kartenansicht. */
export function DashDetailsOrt(p: { state: DashDetailsPageState }) {
  const draft = () => p.state.draft()
  const disabled = () => !p.state.canEdit()
  const showErrors = () => p.state.showErrorsSignal.get()
  const errors = () => p.state.errors()

  return (
    <DashSection
      id="details-ort"
      title="Ort"
      description="Wo findet dein Event statt?"
      actions={
        <LinkButtonExternal
          href={`https://www.openstreetmap.org/search?query=${p.state.mapsQuery()}`}
          variant={buttonVariant.outline}
          class="h-9 px-3 text-sm"
        >
          <Icon path={mdiOpenInNew} class="size-4" />
          In Karten öffnen
        </LinkButtonExternal>
      }
      class="scroll-mt-24"
    >
      <div class="flex flex-col gap-4">
        <DashField label="Name" for="details-venue" required error={showErrors() ? errors()?.venueName : null}>
          <Input
            id="details-venue"
            value={draft()?.venueName ?? ""}
            placeholder="z. B. Stadtpark Freilichtbühne"
            disabled={disabled()}
            aria-invalid={showErrors() && errors()?.venueName ? "true" : undefined}
            class="h-10 text-sm rounded-control"
            onInput={(event) => p.state.setVenue({ name: event.currentTarget.value })}
          />
        </DashField>
        <DashField label="Straße" for="details-street">
          <Input
            id="details-street"
            value={draft()?.venueStreet ?? ""}
            placeholder="Straße und Hausnummer"
            disabled={disabled()}
            class="h-10 text-sm rounded-control"
            onInput={(event) => p.state.setVenue({ street: event.currentTarget.value })}
          />
        </DashField>
        <div class="grid gap-4 sm:grid-cols-[160px_1fr]">
          <DashField label="PLZ" for="details-zip">
            <Input
              id="details-zip"
              value={draft()?.venueZip ?? ""}
              placeholder="10115"
              inputMode="numeric"
              disabled={disabled()}
              class="h-10 text-sm rounded-control"
              onInput={(event) => p.state.setVenue({ zip: event.currentTarget.value })}
            />
          </DashField>
          <DashField label="Stadt" for="details-city" required error={showErrors() ? errors()?.venueCity : null}>
            <Input
              id="details-city"
              value={draft()?.venueCity ?? ""}
              placeholder="Berlin"
              disabled={disabled()}
              aria-invalid={showErrors() && errors()?.venueCity ? "true" : undefined}
              class="h-10 text-sm rounded-control"
              onInput={(event) => p.state.setVenue({ city: event.currentTarget.value })}
            />
          </DashField>
        </div>
        <p class="flex items-center gap-1.5 text-xs text-content-muted">
          <Icon path={mdiMapMarkerOutline} class="size-4 shrink-0" />
          Der Kartenlink öffnet deine Adresse auf OpenStreetMap.
        </p>
      </div>
    </DashSection>
  )
}
