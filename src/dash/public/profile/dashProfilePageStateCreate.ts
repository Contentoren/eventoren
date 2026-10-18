import { dashNow } from "../../store/dashNow.ts"
import { dashOrgBySlug } from "../../store/dashOrgBySlug.ts"
import { dashOrgEvents } from "../../store/dashOrgEvents.ts"
import { dashStateGet } from "../../store/dashStateGet.ts"
import { dashProfileEventsSplit } from "./dashProfileEventsSplit.ts"
import { dashProfilePriceLabel } from "./dashProfilePriceLabel.ts"

export type DashProfileTab = "kommende" | "vergangene"

export interface DashProfilePageInputs {
  orgSlug: () => string
  tab: () => DashProfileTab
  onTab: (tab: DashProfileTab) => void
}

function imprintRows(imprint: {
  legalName: string
  street: string
  zip: string
  city: string
  representative: string
  register: string
  vatId: string
}): Array<{ label: string; value: string }> {
  return [
    { label: "Anbieter", value: imprint.legalName },
    { label: "Adresse", value: `${imprint.street}, ${imprint.zip} ${imprint.city}` },
    { label: "Vertretung", value: imprint.representative },
    { label: "Register", value: imprint.register },
    { label: "USt-IdNr.", value: imprint.vatId },
  ].filter((row) => row.value.replace(/^[,\s]+|[,\s]+$/g, "").length > 0)
}

/** Zustand des öffentlichen Veranstalterprofils: Organisation, geteilte Events, Tabs und Anbieterangaben. */
export function dashProfilePageStateCreate(inputs: DashProfilePageInputs) {
  const now = dashNow()

  const org = () => {
    const found = dashOrgBySlug(inputs.orgSlug())
    if (!found || found.status !== "aktiv") return null
    return found
  }

  const events = () => {
    const current = org()
    if (!current) return { upcoming: [], past: [] }
    return dashProfileEventsSplit({ events: dashOrgEvents(current.id), now: now() })
  }

  const priceLabel = (eventId: string): string | null => {
    const current = org()
    const event = dashOrgEvents(current?.id ?? "").find((entry) => entry.id === eventId)
    if (!event) return null
    return dashProfilePriceLabel({ state: dashStateGet(), event, now: now() })
  }

  const visible = () => {
    const split = events()
    return inputs.tab() === "vergangene" ? split.past : split.upcoming
  }

  return {
    org,
    tab: inputs.tab,
    onTab: inputs.onTab,
    upcoming: () => events().upcoming,
    past: () => events().past,
    visible,
    priceLabel,
    imprintRows: () => {
      const current = org()
      if (!current) return []
      return imprintRows(current.imprint)
    },
    contactHref: () => {
      const current = org()
      if (!current || current.email.trim() === "") return null
      return `mailto:${current.email.trim()}`
    },
  }
}

export type DashProfilePageState = ReturnType<typeof dashProfilePageStateCreate>
