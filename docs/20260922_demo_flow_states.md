# Complete demo flows and data states

## Goal
Represent every admin sidebar destination in `/demo` and its index, connect demo flows, and provide navbar controls for Loaded / Loading / Empty / Error on every data-loading demo page. All demo actions and navigation remain fixture-backed and within `/demo`.

## Decisions
- Preserve existing demo routes and their default scenarios.
- Canonical flow URLs are grouped under `/demo/customer/...` and `/demo/admin/...`; organizer scanning belongs to admin. Existing URLs redirect to their grouped equivalents, preserving state query parameters. The directory separates customer and admin scenarios; shared static/auth showcase pages may remain ungrouped where neither flow applies.
- Add dedicated admin orders (existing `/demo/orders` is customer history), members, and organizer-management demos using existing production views with injected fixture states.
- Use shared demo-only reactive state, optionally reflected in `demoState` query parameters. Controls must update actual page state, not cover pages with a generic overlay.
- Keep German UI conventions: Geladen / Lädt / Leer / Fehler.
- Reuse installed libraries and `#ui/...` components. Do not add dependencies or change production access/backend behavior.
- Preserve the existing dirty worktree; change only necessary feature files.

## Approach
Introduce a shared state contract in the demo shell and navbar with route capabilities and legacy scenario defaults. Adapt fixture state factories to it. Loading state must persist until another state is selected. Missing-detail and empty-list presentations should fit each page. Demo flow navigation includes administrative destinations, creation/detail flows, customer purchase/order flows and organizer selection/check-in; mocked actions must not invoke real services.

## Tasks
1. Implement shared state contract, provider, capability/default mapping, navbar controls and focused tests. Status: completed.
2. Integrate existing data-loading demos: catalog, event detail, customer orders, order status, checkout status, organizer list/detail, and existing admin data views. Audit remaining demo pages for genuine loads and include any discovered. Client-only/static forms need no artificial fetch state. Status: completed.
3. Add missing dedicated admin orders, members and organizer-management demo pages, fixture state adapters, index entries and state control support. Status: completed.
4. Connect and audit demo-only navigation and mocked interactions throughout relevant flows; preserve legacy demo links. Status: completed.
5. Run focused automated checks and browser verification of index coverage, navigation and all supported states; correct feature regressions. Status: completed.
6. Group customer and admin demo routes, update directory/navigation/capabilities, and preserve old URL redirects. Status: completed.

## Current context
`DemoRouteShell` provides `DemoFlowProvider` and navbar controls. Consume `demoFlowContextUse()` with reactive `state()` and `setState()`; capabilities/defaults live in `demoFlowRouteCapabilityResolve`. The optional `demoState` query parameter reflects selection. Integrate real page signals with this context, retaining default legacy scenarios. Organizer-management and admin-orders views may need minimal injection seams. Existing `/demo/orders` is customer history.
Existing data-loading demo factories now consume flow state; retry actions restore loaded fixture data. Cart and signed-out orders remain non-loading scenarios. Reuse this integration pattern for new administrative demos.
Dedicated fixture-backed `/demo/admin/bestellungen`, `/demo/admin/mitglieder`, and `/demo/admin/veranstalter` routes are registered in the directory and support the state controller. The local app is served on port 3057.
Administrative demos share five-destination navigation. Customer and organizer flows use demo-specific links and fixture actions; production views accept optional navigation/state overrides while preserving their defaults.
Event detail uses a flat route outside the catalog parent. Optional view slots and fixture initialization support direct SSR hydration. Demo auth is isolated from production reads. Canonical customer/admin routes, legacy redirects, grouped directory and scenario navigation are complete.

## Acceptance
- Admin orders, events, members, organizer management and ticket scanning have demo pages and index entries.
- Every data-loading demo exposes four meaningful navbar-selectable states, including visible persistent loading.
- Flow links and mocked operations never leave demo routes or perform production mutations.
- Existing scenario routes remain usable.
