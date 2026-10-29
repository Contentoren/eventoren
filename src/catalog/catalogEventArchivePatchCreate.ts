export function catalogEventArchivePatchCreate(input: {
  readonly catalogVersion: number
  readonly eventRevision: number
  readonly now: string
}): {
  readonly status: "archived"
  readonly catalogVersion: number
  readonly eventRevision: number
  readonly updatedAt: string
} {
  return {
    status: "archived",
    catalogVersion: input.catalogVersion,
    eventRevision: input.eventRevision + 1,
    updatedAt: input.now,
  }
}
