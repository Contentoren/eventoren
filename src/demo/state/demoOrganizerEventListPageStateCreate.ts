import { organizerEventListPageStateCreate } from "../../organizer/organizerEventListPageStateCreate.ts"
import { demoOrganizerDataSourceCreate } from "../fixtures/demoOrganizerDataSourceCreate.ts"

export function demoOrganizerEventListPageStateCreate(emptyEvents: boolean) {
  return organizerEventListPageStateCreate({
    dataSource: demoOrganizerDataSourceCreate({ emptyEvents }),
    token: () => "demo",
  })
}
