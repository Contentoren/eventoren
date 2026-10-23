import type { OrganizerTerminationRequest } from "./organizerTerminationRequestSchema.ts"
export function organizerTerminationDeclarationCreate(input: OrganizerTerminationRequest): string {
  const statement =
    input.kind === "widerruf"
      ? "Hiermit widerrufe ich den von mir abgeschlossenen Veranstaltervertrag."
      : `Hiermit kündige ich den Veranstaltervertrag ${input.extraordinaryReason ? "außerordentlich" : "ordentlich"}${input.requestedDate ? ` zum ${input.requestedDate}` : " zum nächstmöglichen Zeitpunkt"}.`
  return [
    statement,
    `Name / Firma: ${input.legalName}`,
    `E-Mail: ${input.email}`,
    `Vertrag / Organisation: ${input.contractReference}`,
    ...(input.extraordinaryReason ? [`Grund: ${input.extraordinaryReason}`] : []),
  ].join("\n")
}
