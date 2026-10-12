export type TicketBagItem = {
  tierId: string
  tierName: string
  tierDescription: string
  quantity: number
  unitPriceCents: number
  unitPriceLabel: string
  totalPriceCents: number
  totalPriceLabel: string
  maxQuantity: number
  activationCodeRequired?: boolean
  activationCode?: string
}
