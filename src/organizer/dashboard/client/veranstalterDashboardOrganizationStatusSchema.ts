import * as v from "valibot"

export const veranstalterDashboardOrganizationStatusSchema = v.picklist(["aktiv", "ausstehend", "gesperrt"])

export type VeranstalterDashboardOrganizationStatus = v.InferOutput<
  typeof veranstalterDashboardOrganizationStatusSchema
>
