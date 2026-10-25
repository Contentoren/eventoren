import { ticketActivationCodeReserveInputSchema } from "#src/ticketing/ticketActivationCodeReserveInputSchema.ts"
import { valibotObjectToConvexFields } from "#src/utils/convex/valibotToConvex.ts"

/** Thin Convex wrapper around the shared reservation input schema. */
export const ticketActivationCodeReserveValidator = valibotObjectToConvexFields(ticketActivationCodeReserveInputSchema)
