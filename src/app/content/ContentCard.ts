/** Display data for one article card on the hub and in "related" lists. */
export type ContentCard = {
  readonly id: string
  readonly href: string
  readonly title: string
  readonly description: string
  readonly categoryLabel: string
  readonly readingTime: string
  readonly date: string
  readonly dateIso: string
  readonly image: {
    readonly src: string
    readonly alt: string
    readonly width?: number
    readonly height?: number
  } | null
}
