export type TicketActivationCodeExport = {
  readonly eventName: string
  readonly productName: string
  readonly codes: readonly { readonly number: number; readonly code: string }[]
}
