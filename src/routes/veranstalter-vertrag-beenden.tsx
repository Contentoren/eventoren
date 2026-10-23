import { createFileRoute } from "@tanstack/solid-router"
import { OrganizerTerminationPage } from "#src/organizer/termination/OrganizerTerminationPage.tsx"
export const Route = createFileRoute("/veranstalter-vertrag-beenden")({ component: OrganizerTerminationPage })
