import { createMemo } from "solid-js"
import { useNavigate } from "@tanstack/solid-router"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { dashDateFormat } from "../../../model/dashDateFormat.ts"
import { dashFeeCompute } from "../../../model/dashFeeCompute.ts"
import { dashIbanMask } from "../../../model/dashIbanMask.ts"
import { dashStateGet } from "../../../store/dashStateGet.ts"
import { dashDownload } from "../../../export/dashDownload.ts"
import { dashFileNameCreate } from "../../../export/dashFileNameCreate.ts"
import { dashPdfReportCreate, type DashPdfReportSection } from "../../../export/dashPdfReportCreate.ts"
import { dashSettlementCompute } from "../../../model/dashSettlementCompute.ts"
import { dashCentsFormat } from "../../../model/dashCentsFormat.ts"
import { dashSettlementPayoutInfo } from "../model/dashSettlementPayoutInfo.ts"
import { dashSettlementWaterfallRows } from "../model/dashSettlementWaterfallRows.ts"

const statusLabels: Record<string, string> = {
  bezahlt: "Bezahlt",
  offen: "Offen",
  storniert: "Storniert",
  erstattet: "Erstattet",
  teilerstattet: "Teilerstattet",
}

const methodLabels: Record<string, string> = {
  karte: "Karte",
  paypal: "PayPal",
  sepa: "SEPA",
  applepay: "Apple Pay",
  googlepay: "Google Pay",
  gutschein: "Gutschein",
  kostenlos: "Kostenlos",
}

function settlementReportPrice(cents: number): string {
  return dashCentsFormat(cents)
}

function settlementReportNegative(cents: number): string {
  return `−${dashCentsFormat(cents)}`
}

/** Zustand der Abrechnungsansicht: Settlement, Statuskarte, Tabellen und Exporte. */
export function dashSettlementViewStateCreate(inputs: { eventId: () => string; readOnly: () => boolean }) {
  const navigate = useNavigate()
  const event = () => dashStateGet().events.find((candidate) => candidate.id === inputs.eventId()) ?? null
  const orgById = (orgId: string | undefined) =>
    orgId === undefined ? null : (dashStateGet().orgs.find((candidate) => candidate.id === orgId) ?? null)
  /** Die Abrechnungsansicht rechnet immer mit der Org des Events, nie mit der aktiven Session-Org. */
  const org = () => orgById(event()?.orgId)
  const settlement = createMemo(() => {
    const current = event()
    const activeOrg = org()
    if (!current || !activeOrg) return null
    const state = dashStateGet()
    return dashSettlementCompute({
      event: current,
      ticketTypes: state.ticketTypes,
      orders: state.orders,
      tickets: state.tickets,
      org: activeOrg,
    })
  })
  const payoutInfo = createMemo(() => {
    const current = event()
    const result = settlement()
    if (!current || !result) return null
    const payout = dashStateGet().payouts.find((candidate) => candidate.eventId === current.id) ?? null
    return dashSettlementPayoutInfo({ event: current, payout, payoutCents: result.payoutCents })
  })
  const maskedIban = () => {
    const activeOrg = org()
    return activeOrg ? dashIbanMask(activeOrg.bank.iban) : "–"
  }
  const statusText = () => {
    const info = payoutInfo()
    if (!info) return "–"
    if (info.status === "ausgezahlt" && info.paidAt)
      return `Ausgezahlt am ${dashDateFormat(info.paidAt, "datum")} · Ref. ${info.reference}`
    if (info.status === "bereit") return info.projected ? "Bereit zur Auszahlung" : "Bereit zur Auszahlung"
    return `Auszahlung geplant am ${dashDateFormat(info.dueAt, "datum")}`
  }
  const waterfall = createMemo(() =>
    settlement()
      ? dashSettlementWaterfallRows({
          ticketRevenueCents: settlement()?.ticketRevenueCents ?? 0,
          refundsCents: settlement()?.refundsCents ?? 0,
          chargebacksCents: settlement()?.chargebacksCents ?? 0,
          platformFeeCents: settlement()?.platformFeeCents ?? 0,
          paymentCostsCents: settlement()?.paymentCostsCents ?? 0,
          payoutCents: settlement()?.payoutCents ?? 0,
        })
      : [],
  )

  const reportMeta = (): [string, string][] => {
    const current = event()
    const activeOrg = org()
    if (!current || !activeOrg) return []
    return [
      [
        "Veranstalter",
        `${activeOrg.imprint.legalName}, ${activeOrg.imprint.street}, ${activeOrg.imprint.zip} ${activeOrg.imprint.city}`,
      ],
      ["Event", `${current.title} · ${dashDateFormat(current.startsAt, "datum")}`],
      ["Stand", dashDateFormat(new Date().toISOString(), "kurz")],
    ]
  }

  const reportSections = (): DashPdfReportSection[] => {
    const result = settlement()
    const activeOrg = org()
    if (!result || !activeOrg) return []
    const grossLines: DashPdfReportSection["rows"] = waterfall().map((row) => ({
      label: row.final ? row.label : row.id === "brutto" ? row.label : `− ${row.label}`,
      value: row.negativ ? settlementReportNegative(row.cents) : settlementReportPrice(row.cents),
      emphasis: row.final,
      tone: row.negativ ? ("negative" as const) : ("neutral" as const),
    }))
    const rateLines = result.taxByRate.map((rate) => ({
      label: `USt ${(rate.rateBps / 100).toFixed(1).replace(".", ",")} %`,
      value: `Brutto ${settlementReportPrice(rate.grossCents)} · Netto ${settlementReportPrice(rate.netCents)} · USt ${settlementReportPrice(rate.taxCents)}`,
    }))
    return [
      { title: "Wasserfall", rows: grossLines.length > 0 ? grossLines : [{ label: "—", value: "—" }] },
      {
        title: "Steuersätze",
        rows:
          rateLines.length > 0
            ? rateLines
            : activeOrg.tax.status === "klein"
              ? [{ label: "Umsatzsteuer", value: "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet." }]
              : [{ label: "—", value: "—" }],
      },
      ...(result.buyerFeesCents > 0
        ? [
            {
              title: "Servicegebühren",
              rows: [
                {
                  label: "Servicegebühren der Käufer (gehen an Eventoren)",
                  value: settlementReportPrice(result.buyerFeesCents),
                },
              ],
            },
          ]
        : []),
    ]
  }

  const positionRows = (): (string | number | null)[][] => {
    const current = event()
    const result = settlement()
    if (!current || !result) return []
    const state = dashStateGet()
    return state.orders
      .filter((order) => order.eventId === current.id)
      .sort((left, right) => (left.createdAt < right.createdAt ? -1 : 1))
      .map((order) => [
        order.number,
        dashDateFormat(order.createdAt, "datum"),
        statusLabels[order.status] ?? order.status,
        order.lines.reduce((sum, line) => sum + line.quantity, 0),
        order.lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0) / 100,
        order.refunds.reduce((sum, refund) => sum + refund.amountCents, 0) / 100,
        order.serviceFeeCents / 100,
        methodLabels[order.payment.method] ?? order.payment.method,
      ])
  }

  const downloadPdf = () => {
    const current = event()
    const info = payoutInfo()
    if (!current || !info) return
    void dashPdfReportCreate({
      title: `Abrechnung · ${current.title}`,
      subtitle:
        info.status === "ausgezahlt" && info.paidAt
          ? `Ausgezahlt am ${dashDateFormat(info.paidAt, "datum")} · Ref. ${info.reference}`
          : `Auszahlung geplant am ${dashDateFormat(info.dueAt, "datum")}`,
      meta: reportMeta(),
      sections: reportSections(),
      footerNote: "Demo-Abrechnung · Eventoren",
    }).then((result) => {
      if (!result.success) {
        toastAdd({ title: "Die Abrechnung konnte nicht erstellt werden.", variant: "error" })
        return
      }
      dashDownload(dashFileNameCreate(["Abrechnung", current.title], "pdf", new Date()), result.data, "application/pdf")
      toastAdd({ title: "Abrechnung heruntergeladen", variant: "success" })
    })
  }

  const downloadCsv = () => {
    const current = event()
    if (!current) return
    const header = ["Nummer", "Datum", "Status", "Tickets", "Ticketwert (€)", "Erstattet (€)", "Gebühr (€)", "Zahlart"]
    const lines = [header, ...positionRows()].map((row) =>
      row
        .map((cell) => {
          if (cell === null) return ""
          if (typeof cell === "number") return String(cell).replace(".", ",")
          const guarded = /^[=+\-@\t\r]/.test(cell) ? `'${cell}` : cell
          return /[;"\r\n]/.test(guarded) ? `"${guarded.replaceAll('"', '""')}"` : guarded
        })
        .join(";"),
    )
    dashDownload(
      dashFileNameCreate(["Positionen", current.title], "csv", new Date()),
      `﻿${lines.join("\r\n")}\r\n`,
      "text/csv;charset=utf-8",
    )
    toastAdd({ title: "Positionen heruntergeladen", variant: "success" })
  }

  const downloadProvision = () => {
    const current = event()
    const result = settlement()
    const activeOrg = org()
    if (!current || !result || !activeOrg) return
    const example = dashFeeCompute({ priceCents: 2500, fee: activeOrg.fee })
    void dashPdfReportCreate({
      title: "Provisionsrechnung (Demo)",
      subtitle: `Eventoren · ${current.title} · ${dashDateFormat(current.startsAt, "datum")}`,
      meta: reportMeta(),
      sections: [
        {
          title: "Provision",
          rows: [
            { label: "Ticketumsatz brutto", value: settlementReportPrice(result.ticketRevenueCents) },
            ...(result.platformFeeCents > 0
              ? [{ label: "Plattformgebühr (Veranstalter)", value: settlementReportPrice(result.platformFeeCents) }]
              : []),
            ...(result.buyerFeesCents > 0
              ? [{ label: "Servicegebühren der Käufer", value: settlementReportPrice(result.buyerFeesCents) }]
              : []),
            {
              label: `Beispiel: 25,00 € Ticket → Gebühr ${settlementReportPrice(example.feeCents)}`,
              value: `Träger: ${activeOrg.fee.payer === "veranstalter" ? "Veranstalter" : "Käufer"}`,
            },
          ],
        },
      ],
      footerNote: "Demo-Provisionsrechnung · Eventoren",
    }).then((resultPdf) => {
      if (!resultPdf.success) {
        toastAdd({ title: "Die Provisionsrechnung konnte nicht erstellt werden.", variant: "error" })
        return
      }
      dashDownload(
        dashFileNameCreate(["Provisionsrechnung", current.title], "pdf", new Date()),
        resultPdf.data,
        "application/pdf",
      )
      toastAdd({ title: "Provisionsrechnung heruntergeladen", variant: "success" })
    })
  }

  const openSettings = () => {
    void navigate({ to: "/demo/dashboard/einstellungen" as never })
  }

  return {
    event,
    org,
    readOnly: () => inputs.readOnly(),
    settlement,
    payoutInfo,
    maskedIban,
    statusText,
    waterfall,
    downloadPdf,
    downloadCsv,
    downloadProvision,
    openSettings,
  }
}

export type DashSettlementViewState = ReturnType<typeof dashSettlementViewStateCreate>
