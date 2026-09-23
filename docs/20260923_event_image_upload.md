# Event image upload through Convex and assets-service

## Goal
Allow event administrators to upload an image using drag/drop or a file picker while retaining direct image URL entry. Route uploads through Convex temporary storage and a trusted Convex action to assets-service.contentoren.de. Publish optimized variants and use the appropriate variant in each website context.

## Decisions
- Reuse existing admin authorization and #ui components; no new dependencies unless required.
- The authenticated SolidStart server POSTs file bytes to a Convex HTTP action, which stores and internally binds the blob. Pass storage IDs, not image bytes, to processing actions; never expose the account bearer or an arbitrary-ID registration mutation to the browser.
- Service credentials stay in private Convex environment variables. Do not silently repurpose a personal CLI token or provision identities without authorization.
- Use three AVIF quality-80 output boxes: detail 1920x820, card 1200x900, organizer 1920x1080. Service resizing preserves aspect ratio without enlargement; existing object-cover supplies display cropping.
- Retain imageUrl for external URLs/backward compatibility; persist optional variant references for uploaded images. Manual URL edits clear uploaded variants.
- Follow actual SDK upload, processing, and publication contracts from ~/projects/assets-service; do not infer public URLs or assume output mutations publish automatically.
- Validate administrator access, supported image types and size, staging ownership, and cleanup. Return usable errors without exposing secrets.

## Approach and tasks
1. Backend: implement authenticated staging and upload action, service adapter, variant persistence/schema propagation, and focused tests. Resolve publication and public URLs from actual service contracts. Document private runtime configuration.
2. Frontend: integrate upload/drop UI and state, keep URL entry and alt text, and select variant by rendering context. Reuse existing components and accessible native file input.
3. Verification: focused backend tests/type checks, then browser verification of event editor, URL compatibility, and upload behavior when runtime credentials are available.

## Current context
- Tasks 1–2 implemented locally; task 3 in progress.
- Backend upload contract: adminImageUploadFromSession(FormData) returns Result containing detail/card/organizer URLs. Save detail as imageUrl and all variants as imageVariants; manual URL edits clear variants.
- Node action uses the service HTTP contracts because the SDK root includes a Bun-only export. Runtime configuration is documented in docs/event_image_backend.md.
- Existing local CLI access works; dedicated runtime identity and deployed Convex credentials are not established.
- Existing worktree changes must be preserved.
- Scope is event image uploads, not a general asset-management interface or assets-service redesign.
