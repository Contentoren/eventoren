# Admin member role controls

## Goal
On `/admin/mitglieder`, replace the two role-filter checkboxes with a single-choice `CheckSingle` showing `Alle`, `Admin`, `Veranstalter`; render organizer grant/revoke actions as contrast buttons with plus/minus icons.

## Decisions and approach
- Reuse controls via `#ui/...` and existing icon library; avoid new dependencies or unrelated styling changes.
- `Alle` is the default and denotes the union of Admin and Veranstalter. Preserve filtering of members with roles, search behavior, and URL-backed `memberRole` filters. Treat legacy URLs containing both valid role values as `Alle`; prefer a canonical no-role-parameter URL for `Alle` on future selections. Prevent deselecting the active single choice.
- Keep the existing accessible per-member action labels, pending/disabled behavior, and role-changing flow.
- Run focused type/style checks after implementation; delay browser verification until both UI changes are complete.

## Tasks
1. [pending] Replace checkbox filter with `CheckSingle` and adapt state/URL mapping as needed.
2. [pending] Use contrast icon buttons for organizer grant (+) and revoke (-).
3. [pending] Verify focused checks and UI behavior on `/admin/mitglieder` in browser.

## Current context
Current role filters are two independent checkboxes; empty URL filter means all members with at least one role, and matching is OR-based. `CheckSingle` is a single-value signal-backed selector. Existing query params may contain one or both role values.
