import { httpRouter } from "convex/server"
import { addHttpRoutesAuth } from "#src/auth/convex/addHttpRoutesAuth.ts"
import { catalogImageUploadHttpAction } from "#src/catalog/convex/catalogImageUploadHttpAction.ts"
import { ticketPaymentOutcomeHttpAction } from "#src/ticketing/convex/ticketPaymentOutcomeHttpAction.ts"

const http = httpRouter()

addHttpRoutesAuth(http)
http.route({ path: "/api/catalog/image-upload", method: "POST", handler: catalogImageUploadHttpAction })
http.route({ path: "/eventoren/payment-outcomes", method: "POST", handler: ticketPaymentOutcomeHttpAction })

export default http
