# Event image upload through Convex and assets-service

## Goal
Allow event administrators to upload an image using drag/drop or a file picker while retaining direct image URL entry. Route uploads through Convex temporary storage and a trusted Convex action to assets-service.contentoren.de. Publish optimized variants and use the appropriate variant in each website context.

## Decisions
- Reuse existing admin authorization and #ui components; no new dependencies unless required.
- The authenticated SolidStart server POSTs file bytes to a Convex HTTP action, which stores and internally binds the blob. Pass storage IDs, not image bytes, to processing actions; never expose the account bearer or an arbitrary-ID registration mutation to the browser.
- Service credentials stay in private Convex environment variables. Reuse an existing CLI token only with explicit authorization; do not provision identities without authorization.
- Use three AVIF quality-80 output boxes: detail 1920x820, card 1200x900, organizer 1920x1080. Service resizing preserves aspect ratio without enlargement; existing object-cover supplies display cropping.
- Retain imageUrl for external URLs/backward compatibility; persist optional variant references for uploaded images. Manual URL edits clear uploaded variants.
- Follow actual SDK upload, processing, and publication contracts from ~/projects/assets-service; do not infer public URLs or assume output mutations publish automatically.
- Validate administrator access, supported image types and size, staging ownership, and cleanup. Return usable errors without exposing secrets.

## Approach and tasks
1. Backend: implement authenticated staging and upload action, service adapter, variant persistence/schema propagation, and focused tests. Resolve publication and public URLs from actual service contracts. Document private runtime configuration.
2. Frontend: integrate upload/drop UI and state, keep URL entry and alt text, and select variant by rendering context. Reuse existing components and accessible native file input.
3. Verification: focused backend tests/type checks, then browser verification of event editor, URL compatibility, and upload behavior when runtime credentials are available.

## Current context
- Implementation complete; a fresh live admin browser upload on 2026-09-23 returned HTTP 200 with all three image URLs returning GET 200 and decoding as AVIF (card 1200×675, detail 1458×820, organizer 1920×1080). A separate canonical-preview browser E2E uploaded `fusion-header-grid.png` through the file input, displayed a loaded 1280×577 AVIF preview, saved a uniquely named draft event, navigated away and reopened it to confirm the same image URL and alt text persisted, then deleted only the test event through the admin list. All three published URLs for this upload returned GET 200 (`image/avif`) after cleanup. Date editing was not tested; service assets were not deleted because of the catalog deletion issue below.
- Backend upload contract: adminImageUploadFromSession(FormData) returns Result containing detail/card/organizer URLs. Save detail as imageUrl and all variants as imageVariants; manual URL edits clear variants.
- Node action uses the service HTTP contracts because the SDK root includes a Bun-only export. Runtime configuration is documented in docs/event_image_backend.md.
- The approved credential is configured only on the canonical app's `eventoren-convex.leonardomora.de` deployment, not the separate `contentoren.de` deployment. The preview Quadlet durably maps its own backend/site origins via pasta's host-loopback gateway to Caddy. After this networking fix, a real upload published into R2 but returned 404 URLs: the service catalog paths are relative output keys while the actual public objects live at `eventoren/public/{key}`. Both assets-service environment public bases were corrected to their verified R2 namespace locations, and the Eventoren URL resolver was fixed to retain the base path; the canonical Convex functions were redeployed without resetting private env vars. The post-fix upload asset is `asset-upload-a9491300-8bc0-4ad6-88d7-9e978c187e21`; prior test-only assets are `asset-upload-cf856999-c2fb-44b6-917f-de7831153547` (failed partial deletion), `asset-upload-468e5209-5b67-43f6-937f-1d0db6d020cc` (first successful backend upload) and `asset-upload-3998d8d3-baaa-49e7-9b50-1e96b88e7d08` (pre-fix browser retry). The failed deletion removed remote objects before replacement-catalog preparation failed (`catalog_prepare_failed`, replacement catalog object does not match its manifest); its DB record still exists with `deletionStatus: failed`. Do not retry deletions of these test assets without resolving the service's shared immutable catalog manifest/deletion safety first; preserve other project assets and shared catalog objects.
- Existing worktree changes must be preserved.
- Scope is event image uploads, not a general asset-management interface or assets-service redesign.
