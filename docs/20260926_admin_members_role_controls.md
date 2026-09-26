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
3. [completed] Verify focused checks and shared UI behavior on the backend-free demo route; live `/admin/mitglieder` remains unavailable locally due to SSO configuration.

## Current context
The selector maps Alle to no role URL parameter, one valid role to that role, and both legacy role values to Alle. Production and demo filtering restrict Alle to admin or organizer members; focused tests cover the options. Organizer actions use `ButtonIcon` contrast with plus/minus icons. Focused tests and Biome passed; global typecheck has unrelated admission-range errors. Browser checks on `https://eventoren.contentoren.de/demo/admin/members` verified selection, list updates, deselection prevention, and contrast +/- actions; local `/admin/mitglieder` cannot be verified without valid SSO origin/callback configuration. The demo preview is a deployment, not direct evidence of the current workspace revision.
