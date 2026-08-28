import type { ResultErr } from "./ResultErr.ts"
import type { ResultOk } from "./ResultOk.ts"

export type Result<T> = ResultOk<T> | ResultErr
