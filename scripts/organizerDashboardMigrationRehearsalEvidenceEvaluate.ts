import {
  type RehearsalComparisonInput,
  type RehearsalSnapshot,
  organizerDashboardMigrationRehearsalSnapshotCompare,
} from "./organizerDashboardMigrationRehearsalSnapshotCompare.ts"

type RehearsalEvidenceInput = Omit<RehearsalComparisonInput, "before" | "after" | "phase"> & {
  readonly baseline: RehearsalSnapshot
  readonly postFixtures: RehearsalSnapshot
  readonly mid: RehearsalSnapshot
  readonly final: RehearsalSnapshot
}

/** Creation has its own checkpoint: exactly two synthetic consent/evidence/audit
 * sets, never a blanket table exemption. Subsequent comparisons preserve those
 * new rows too. Apply evidence is aggregate, NOT proof that each refused call
 * made zero transient writes; target-plan checks are reported separately.
 */
export function organizerDashboardMigrationRehearsalEvidenceEvaluate(input: RehearsalEvidenceInput) {
  const fixtures = organizerDashboardMigrationRehearsalSnapshotCompare({
    ...input,
    before: input.baseline,
    after: input.postFixtures,
    phase: "fixtures",
  })
  const apply = organizerDashboardMigrationRehearsalSnapshotCompare({
    ...input,
    before: input.postFixtures,
    after: input.mid,
    phase: "apply",
  })
  const backfill = organizerDashboardMigrationRehearsalSnapshotCompare({
    ...input,
    before: input.mid,
    after: input.final,
    phase: "backfill",
  })
  const comparisons = [fixtures, apply, backfill]
  return {
    passed: comparisons.every((comparison) => comparison.passed),
    fixtureCheckpointMatchesExpected: fixtures.passed,
    applyCheckpointMatchesExpected: apply.passed,
    backfillCheckpointMatchesExpected: backfill.passed,
    idHashesPreserved: comparisons.every((comparison) => comparison.shapeValid && comparison.idsPreserved),
    originalFieldsPreserved: comparisons.every((comparison) => comparison.originalFieldsPreserved),
    countDeltasAllowlisted: comparisons.every((comparison) => comparison.additionsExpected && comparison.idsPreserved),
    // Audit validation includes exact actor/org/area/action/note and preserved originals.
    auditMatchesBackfillPages: backfill.additionsExpected,
    eventFieldsPreserved: comparisons.every((comparison) => comparison.eventFieldsPreserved),
    orderFieldsPreserved: comparisons.every((comparison) => comparison.orderFieldsPreserved),
    // Unique baseline rows vs cumulative checkpoint comparisons are deliberately distinct.
    baselineDocumentsChecked: fixtures.originalDocumentsChecked,
    baselineTableMappingsChecked: input.baseline._tables?.length ?? 0,
    checkpointDocumentComparisons: comparisons.reduce(
      (total, comparison) => total + comparison.originalDocumentsChecked,
      0,
    ),
  }
}
