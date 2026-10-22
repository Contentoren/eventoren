import * as a from "valibot"

export const organizerEventDetailMobileViewSchema = a.picklist(["profile", "scanner", "tickets"])

export type OrganizerEventDetailMobileView = a.InferOutput<typeof organizerEventDetailMobileViewSchema>
