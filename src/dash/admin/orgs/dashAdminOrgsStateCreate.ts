import { createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

import type { DashOrg } from "../../model/dashOrgSchema.ts"
import type { DashOrgStatus } from "../../model/dashOrgStatusSchema.ts"
import { dashCentsFormat } from "../../model/dashCentsFormat.ts"
import { dashStateGet } from "../../store/dashStateGet.ts"
import { dashOrgStats } from "../../model/dashOrgStats.ts"
import { dashNow } from "../../store/dashNow.ts"

export type DashAdminOrgStatusFilter = DashOrgStatus | "alle"

export type DashAdminOrgRow = {
  org: DashOrg
  ownerName: string
  eventCount: number
  revenueCents: number
  feeLabel: string
}

export type DashAdminOrgsSearch = {
  status: DashAdminOrgStatusFilter
  q: string
}

/** Leniente Search-Validierung für die Admin-Organisationsliste. */
export function dashAdminOrgsSearchParse(raw: Record<string, unknown>): DashAdminOrgsSearch {
  const statusRaw = typeof raw["status"] === "string" ? raw["status"] : "alle"
  const status: DashAdminOrgStatusFilter =
    statusRaw === "pruefung" || statusRaw === "aktiv" || statusRaw === "gesperrt" || statusRaw === "alle"
      ? statusRaw
      : "alle"
  const q = typeof raw["q"] === "string" ? raw["q"] : ""
  return { status, q }
}

function dashAdminOrgFeeLabel(org: DashOrg): string {
  const percent = dashCentsFormat(Math.round((org.fee.percentBps / 100) * 100), {}).replace(" €", "")
  const fixed = dashCentsFormat(org.fee.fixedCents)
  const payer = org.fee.payer === "kaeufer" ? "Käufer" : "Veranstalter"
  return `${percent.replace(",00", "")} % + ${fixed} · ${payer}`
}

const kindLabels: Record<DashOrg["kind"], string> = {
  verein: "Verein",
  unternehmen: "Unternehmen",
  schule: "Bildungseinrichtung",
  privat: "Privat",
}

export function dashOrgKindLabel(kind: DashOrg["kind"]): string {
  return kindLabels[kind]
}

export function dashAdminOrgsStateCreate(inputs: { search: () => DashAdminOrgsSearch }) {
  const qDraft = createSignalObject(inputs.search().q)
  const now = dashNow()

  const rows = createMemo((): DashAdminOrgRow[] => {
    const state = dashStateGet()
    const current = now()
    return state.orgs.map((org) => {
      const owner =
        state.members.find((member) => member.orgId === org.id && member.role === "inhaber") ??
        state.members.find((member) => member.orgId === org.id) ??
        null
      const stats = dashOrgStats({ state, orgId: org.id, range: 30, now: current })
      return {
        org,
        ownerName: owner?.name ?? "—",
        eventCount: state.events.filter((event) => event.orgId === org.id).length,
        revenueCents: stats.revenueCents,
        feeLabel: dashAdminOrgFeeLabel(org),
      }
    })
  })

  const counts = createMemo((): Record<DashAdminOrgStatusFilter, number> => {
    const all = rows()
    return {
      pruefung: all.filter((row) => row.org.status === "pruefung").length,
      aktiv: all.filter((row) => row.org.status === "aktiv").length,
      gesperrt: all.filter((row) => row.org.status === "gesperrt").length,
      alle: all.length,
    }
  })

  const filtered = createMemo((): DashAdminOrgRow[] => {
    const { status, q } = inputs.search()
    const needle = q.trim().toLowerCase()
    return rows()
      .filter((row) => (status === "alle" ? true : row.org.status === status))
      .filter((row) => {
        if (needle === "") return true
        return (
          row.org.name.toLowerCase().includes(needle) ||
          row.org.slug.toLowerCase().includes(needle) ||
          row.ownerName.toLowerCase().includes(needle)
        )
      })
      .sort((left, right) => left.org.name.localeCompare(right.org.name, "de"))
  })

  return { qDraft, rows, counts, filtered }
}

export type DashAdminOrgsState = ReturnType<typeof dashAdminOrgsStateCreate>
