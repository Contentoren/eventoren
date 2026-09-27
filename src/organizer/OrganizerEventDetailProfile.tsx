import { organizerEventDetailProfileStateCreate } from "./organizerEventDetailProfileStateCreate.ts"

export function OrganizerEventDetailProfile() {
  const state = organizerEventDetailProfileStateCreate()
  return <section aria-label="Profil">{state.renderContent()}</section>
}
