export type TicketActivationCodeGenerateResult = {
  readonly eventKey: string
  readonly tierKey: string
  readonly generated: readonly {
    readonly id: string
    readonly number: number
    readonly code: string
    readonly status: "available"
  }[]
  readonly lastNumber: number
}
