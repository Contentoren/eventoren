import { httpAction } from "#convex/_generated/server.js"
import { returnCorsPreflightResponse } from "./returnCorsPreflightResponse.js"

export const corsOptionsHttpHandler = httpAction(returnCorsPreflightResponse)
