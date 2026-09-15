import { organizerEventDetailPageStateCreate } from "../../organizer/organizerEventDetailPageStateCreate.ts"
import { demoOrganizerDataSourceCreate } from "../fixtures/demoOrganizerDataSourceCreate.ts"

export function demoOrganizerEventDetailPageStateCreate(inputs: {
  readonly eventKey: () => string
  readonly initialSearch: () => string
  readonly initialTicketId: () => string
  readonly searchReplace: (search: string, ticketId: string) => void
}) {
  return organizerEventDetailPageStateCreate({
    ...inputs,
    dataSource: demoOrganizerDataSourceCreate(),
    token: () => "demo",
  })
}
