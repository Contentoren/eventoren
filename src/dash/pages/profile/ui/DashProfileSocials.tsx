import { For } from "solid-js"

import { dashSocialNetworksCreate } from "../../../ui/social/dashSocialNetworks.ts"
import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import type { DashProfilePageState } from "../dashProfilePageStateCreate.ts"
import { DashProfileSocialField } from "./DashProfileSocialField.tsx"

/** Profil-Sektion: Social-Media-Profile mit Marken-Icons und Präfix-Addon im Feld. */
export function DashProfileSocials(p: { state: DashProfilePageState; disabled: boolean }) {
  const errors = () => p.state.liveErrors()
  return (
    <DashSection title="Social Media" description="Nutzername oder URL genügt – wir bauen daraus den Link.">
      <DashField label="Profile" hint="Leere Felder blenden wir auf deinem öffentlichen Profil aus.">
        <div class="flex flex-col gap-4">
          <For each={dashSocialNetworksCreate()}>
            {(network) => (
              <DashProfileSocialField
                state={p.state}
                disabled={p.disabled}
                network={network}
                error={errors()[`socials.${network.id}`]}
              />
            )}
          </For>
        </div>
      </DashField>
    </DashSection>
  )
}
