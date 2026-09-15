export type OrganizerScannerOutcome = {
  readonly kind: "success" | "denied"
  readonly message: string
  readonly code: string
}
