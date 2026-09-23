import { httpRouter } from "convex/server"
import { addHttpRoutesAuth } from "#src/auth/convex/addHttpRoutesAuth.ts"
import { catalogImageUploadHttpAction } from "#src/catalog/convex/catalogImageUploadHttpAction.ts"

const http = httpRouter()

addHttpRoutesAuth(http)
http.route({ path: "/api/catalog/image-upload", method: "POST", handler: catalogImageUploadHttpAction })

export default http
