# Admin member role controls

## Goal
On `/admin/mitglieder`, replace the two role-filter checkboxes with a single-choice `CheckSingle` showing `Alle`, `Admin`, `Veranstalter`; render organizer grant/revoke actions as contrast buttons with plus/minus icons.

## Decisions and approach
- Reuse controls via `#ui/...` and existing icon library; avoid new dependencies or unrelated styling changes.
- `Alle` is the default and denotes the union of Admin and Veranstalter. Preserve filtering of members with roles, search behavior, and URL-backed `memberRole` filters. Treat legacy URLs containing both valid role values as `Alle`; prefer a canonical no-role-parameter URL for `Alle` on future selections. Prevent deselecting the active single choice.
- Keep the existing accessible per-member action labels, pending/disabled behavior, and role-changing flow.
- Run focused type/style checks after implementation; delay browser verification until both UI changes are complete.

## Tasks
1. [completed] Replace checkbox filter with `CheckSingle` and adapt state/URL mapping as needed.
2. [completed] Use contrast icon buttons for organizer grant (+) and revoke (-).
3. [pending] Verify focused checks and UI behavior on `/admin/mitglieder` in browser.

## Current context
The selector maps Alle to no role URL parameter, one valid role to that role, and both legacy role values to Alle. Production and demo filtering now restrict Alle to admin or organizer members; a focused test covers this and the other options. Organizer actions use `ButtonIcon` contrast with plus/minus icons. Focused tests and Biome pass; global typecheck reports unrelated admission-range errors. Actual `/admin/mitglieder` is blocked locally by SSO origin/callback configuration; the backend-free `/demo/admin/members` route can verify the shared controls.
