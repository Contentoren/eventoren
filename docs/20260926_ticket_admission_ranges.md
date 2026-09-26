# Ticketprodukt: zusätzliche Einlasszeiträume

## Goal
- In `/admin/events/:eventKey?tab=products`, each entry added by “Weiteren Einlass hinzufügen” has its own required start and end datetime.
- Make “Ticketprodukt speichern” use the existing `contrast` button variant.
- Make create/edit/save validation consistent: incomplete or invalid admission ranges must produce a clear error, valid products must save, and invalid input must not silently reuse an earlier value.

## Decisions
- The existing primary `doorsAt` stays a single timestamp; only additional admissions become ranges.
- Store additional ranges as `{ startsAt: string; endsAt: string }` in the catalog and expose them consistently in the admin draft and event tier. Preserve existing stored single timestamps on read/edit without inventing an end time: show the legacy start with an empty end until an administrator supplies the end before saving. Keep schema read compatibility with existing documents.
- Use existing UI components via `#ui/...` and the existing `contrast` variant. No new dependencies. Limit changes to admin catalog/form, relevant model/storage/mapping and focused tests; ticket/order rendering is outside scope because it does not currently consume additional admissions.

## Tasks
1. Update tier/draft/client/storage contracts and mapping for additional admission ranges with legacy timestamp compatibility. Validate complete chronological ranges at the save boundary. Add focused catalog/mutation tests. Status: completed.
2. Update admin create/edit form state and UI to edit start/end per additional admission, handle clearing/replacing dates correctly, present precise validation, and use `contrast` for save. Add focused form state tests. Status: completed.
3. Verify focused tests and, if local authentication permits, browser-check the products tab create/edit/save flow. Status: in progress.

## Current context
- User confirmed each additional admission is a start/end range, not missing product-level dates. Exact intermittent validation error is unknown.
- Existing `additionalDoorsAt` is an array of single ISO timestamps; current form has one datetime input per additional admission, and an empty new entry blocks save.
- Contracts, storage mapping, and form now support ranges, including legacy entries with an unset end; validation feedback and the contrast save button are implemented. Focused backend/form tests and typecheck pass.
