import type { HasCreatedAt } from "#src/utils/data/HasCreatedAt.ts"
import type { HasUpdatedAt } from "#src/utils/data/HasUpdatedAt.ts"
import type { MayHaveDeletedAt } from "#src/utils/data/MayHaveDeletedAt.ts"

export interface HasCreatedAtUpdatedDeletedAt extends HasCreatedAt, HasUpdatedAt, MayHaveDeletedAt {}
