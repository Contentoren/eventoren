import { join } from "node:path"

/** File-local lifecycle state lives beside the invocation checkpoint under the same target identity. */
export function nativeAuthLifecycleCheckpointPath(directory: string): string {
  return join(directory, "native-auth-lifecycle-checkpoint.json")
}
