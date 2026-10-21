export type OrganizerDashboardEventListCursor = {
  version: number
  userId: string
  orgId: string
  status: string | null
  sort: string | null
  search: string
  fromStartsAt: string | null
  toStartsAt: string | null
  sourceCursor: string
}

export const organizerDashboardEventListCursorVersion = 1

export function organizerDashboardEventListCursorCreate(args: {
  userId: string
  orgId: string
  status: string | null
  sort: string | null
  search: string
  fromStartsAt: string | null
  toStartsAt: string | null
  sourceCursor: string
}): string {
  const cursor: OrganizerDashboardEventListCursor = { version: organizerDashboardEventListCursorVersion, ...args }
  return JSON.stringify(cursor)
}
