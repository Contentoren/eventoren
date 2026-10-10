# Event image backend

## Private configuration

Configure these variables on the Convex deployment that handles uploads; they must not be exposed through `VITE_*`, frontend bundles, source files, or checked-in environment files:

| Variable | Purpose |
| --- | --- |
| `ASSETS_SERVICE_API_URL` | Assets-service HTTP API origin; client endpoints are under `/api/v1`. |
| `ASSETS_SERVICE_PROJECT_ID` | Eventoren assets-service project ID. |
| `ASSETS_SERVICE_ENVIRONMENT` | Target assets-service environment (`development` or `production`). |
| `ASSETS_SERVICE_ACCESS_TOKEN` | Server-only bearer with upload and output-set permissions. |

The `convex:env:upload` scripts provision these values from the existing private assets CLI configuration. Keep that configuration only on the provisioning host. Missing settings cause uploads to fail closed.

## Upload and publication flow

The admin browser submits a file to the authenticated SolidStart `adminImageUploadFromSession` function. SolidStart forwards the file to the Convex HTTP `/api/catalog/image-upload` endpoint with its server-held bearer. Convex stores the blob, binds its storage ID to an admin-owned stage, then invokes internal processing. The browser receives published image URLs, never the bearer or storage ID.

JPEG, PNG, WebP, and AVIF files up to 10 MiB are accepted. MIME type and extension must agree; the backend also checks staged metadata and file magic bytes. The upload flow waits for ingestion and output processing/publication before returning URLs. It resolves the required published catalog outputs for the asset and image class against the environment's `publicBaseUrl`, preserving any path prefix. Missing output/catalog data fails the operation rather than fabricating a URL.

Successful uploads provide detail, card, and organizer variants. Save `imageUrl` as the detail URL for legacy consumers and save all variants in `imageVariants`. Manually changing the URL clears the variants; saving an unchanged URL retains them. Older records without variants remain supported. Billing synchronization omits variants because its event contract is strict.

Output processing may run in the service project's default environment. When the requested target differs, the adapter reprocesses and waits for that target environment before reading its catalog. Published output base URLs must include the environment's configured public path prefix.

The assets-service SDK root package export is not Node-safe for the isolated Convex action, so the action uses a small `fetch` transport for the documented `/api/v1` JSON envelope and endpoint contracts. The private bearer is sent only to the service API, never to the signed object-storage upload.

Each upload receives a unique staged asset identity to prevent same-named files from overwriting another event's image. Stages expire and are cleaned up after processing; if validation or authorization fails after storage, the HTTP action removes the newly stored blob.
