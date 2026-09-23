# Event image backend (task 1)

## Private Convex action configuration

Set these **on the intended Convex deployment** through its approved deployment-secret workflow (development and production separately). Do not put them in `VITE_*`, client bundles, source files, checked-in `.env` files, or the assets CLI's personal environment. No values are provisioned by this change.

| Variable | Required value |
| --- | --- |
| `ASSETS_SERVICE_API_URL` | assets-service HTTP API origin, e.g. `https://assets-service.contentoren.de` (the 0.6.5 SDK appends `/api/v1`) |
| `ASSETS_SERVICE_PROJECT_ID` | The service project **ID** for Eventoren, not its display name |
| `ASSETS_SERVICE_ENVIRONMENT` | `development` or `production`, matching this Convex deployment's intended asset environment |
| `ASSETS_SERVICE_ACCESS_TOKEN` | Dedicated server-only bearer credential for the service project/organization; must have upload and **admin output-set** permission (output-set endpoint requires admin) |

An operator must authorize/provision that dedicated service identity and verify its access to the selected project/environment, its public storage binding, and its publication worker. Do not reuse a personal CLI credential. Uploads fail closed with a configuration error if any variable is missing. Configuration presence and a live publication have **not** been verified against a deployment.

## Upload transport

The admin UI sends `FormData` to the authenticated SolidStart `adminImageUploadFromSession` server function and receives only `Result<EventImageVariants>` (`assetId`, `detail`, `card`, `organizer` are published URLs). The account bearer stays server-side: SolidStart POSTs the **File** to the Convex HTTP `/api/catalog/image-upload` endpoint with its bearer. The HTTP action stores the received blob itself and internally binds the returned storage ID to an admin-owned stage in one mutation; it then invokes the internal processing action. No public mutation accepts a storage ID, no image bytes are Convex action arguments, and the browser receives no bearer or storage ID. Accept JPEG, PNG, WebP or AVIF up to 10 MiB; MIME and extension must agree. The action additionally checks staged metadata and actual file magic bytes. `CONVEX_SITE_URL` (or `VITE_CONVEX_SITE_URL` / `PUBLIC_BASE_URL_API`) points SolidStart at the Convex HTTP endpoint; local default is port 3211.

On successful upload, set **both** `imageUrl = result.data.detail` (legacy fallback) and `imageVariants = result.data` on `CatalogEventUpsertInput`/`AdminEventDraft`. On a manual URL change omit/clear `imageVariants`; backend clears previously stored variants if the URL changed, while older clients saving an unchanged URL retain them. Admin listing/public EventItem/organizer projection include optional `imageVariants`; old records remain valid. The local sync snapshot includes these references, but the Billing push intentionally omits them because installed Billing 0.1.3 uses a strict event schema without `imageVariants`.

## Service contract and lifecycle

Contract verified against installed `@adaptive-ds/assets-service` 0.6.5: `uploadIntentCreate` → `uploadObjectPut` (signed PUT) → `uploadCompletionComplete({sha256})` → `workflowWait` for ingestion; then `assetOutputsSet` with **three** AVIF quality-80 boxes (`detail` 1920×820, `card` 1200×900, `organizer` 1920×1080) → wait for the **separate** processing and `publish_asset` workflow. Source: `assets-service/src/asset/assetApiRepositoryCreate.ts` and `src/workflow/assetProcessingWorkflowEnqueue.ts`. The service's Sharp resize uses `fit: "inside", withoutEnlargement: true` (no crop). Only after the second workflow succeeds do we read `catalogCurrentRead(projectId, environment)` and `environmentRead`; each required catalog output is matched by **assetId + output key + image class**, and its published `path` is resolved against that environment's `publicBaseUrl`. A signed staging URL and `assetOutputVersionContentUrlCreate` are **not** public image URLs. Neither upload acceptance nor defining outputs is publication. A missing output/current catalog fails the operation instead of fabricating a URL.

Service 0.6.5 `assetOutputsSet` enqueues its workflow in the **project default environment** (not necessarily the upload target). If the requested environment differs, the adapter also calls `assetReprocess({environmentId})` and waits for that target environment's processing/publication workflow before reading its current catalog. This is necessary for development and production when the same service project has a different default.

The 0.6.5 SDK only exports its **whole** root library: importing it in Node fails (`ERR_UNSUPPORTED_ESM_URL_SCHEME`, `bun:sqlite` from server-side re-exports). No supported client-only subpath exists. The isolated Node Convex action therefore uses a small `fetch` transport implementing the SDK's documented `/api/v1` JSON `{ok,data}` envelope and exact endpoint contracts, without importing the root module at runtime. The private bearer header is sent only to the service API, never to the signed PUT. This avoids both Convex's default-runtime `node:crypto` issue and the SDK's Node import incompatibility; do not replace with the SDK root import until the service publishes a Node-safe client-only export.

The service identifies existing assets by folder and basename; the unique Convex stage ID is inserted before the original extension in the service filename to prevent two admins uploading `image.png` from overwriting each other's event asset.

Registered stages have a one-hour expiry cleanup scheduled at creation and are deleted after processing (including failures). If validation or authorization fails after storage, the HTTP action deletes its newly stored blob; the browser cannot claim or delete another storage ID.
