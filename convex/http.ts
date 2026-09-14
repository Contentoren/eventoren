import { httpRouter } from "convex/server"
import { addHttpRoutesAuth } from "#src/auth/convex/addHttpRoutesAuth.ts"

const http = httpRouter()

addHttpRoutesAuth(http)

export default http
