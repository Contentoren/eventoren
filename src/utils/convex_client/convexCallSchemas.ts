import * as a from "valibot"

/**
 * Shared valibot source for generic convex-call dispatch. The CLI, MCP tool
 * and TS client all validate through these schemas (or thin derived wrappers
 * for surface-specific coercion) so module/name/args handling stays DRY.
 */

export const convexCallModuleSchema = a.string()

export const convexCallFunctionSchema = a.string()

export const convexCallArgsSchema = a.record(a.string(), a.unknown())

export const convexCallRequestSchema = a.object({
  module: convexCallModuleSchema,
  name: convexCallFunctionSchema,
  args: a.optional(convexCallArgsSchema),
})

export type ConvexCallRequest = a.InferOutput<typeof convexCallRequestSchema>

/** Parses a canonical convex-call request; throws on invalid input. */
export function convexCallRequestParse(input: unknown): ConvexCallRequest {
  return a.parse(convexCallRequestSchema, input)
}

/**
 * Validated args record shared by all surfaces; throws on non-object input.
 * Arrays are rejected explicitly: records decode them to keyed objects,
 * which must fail fast instead of reaching the network.
 */
export function convexCallArgsParse(input: unknown): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("Invalid convex-call args: expected an object")
  }
  return a.parse(convexCallArgsSchema, input)
}

/**
 * MCP `convex-call` tool input. Keeps the `function` key for tool callers and
 * defaults missing args to `{}`.
 */
export const mcpConvexCallInputSchema = a.object({
  module: convexCallModuleSchema,
  function: convexCallFunctionSchema,
  args: a.optional(convexCallArgsSchema, {}),
})

export type McpConvexCallInput = a.InferOutput<typeof mcpConvexCallInputSchema>

/** TS-client args: the same record, absent means `{}`. */
export const apiClientConvexCallArgsSchema = convexCallArgsSchema

function convexCallCliCoerceValue(value: unknown): unknown {
  if (typeof value !== "string") return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

/**
 * CLI args wrapper. The CLI decodes `--json`/stdin bodies with JSON.parse
 * first, so values usually arrive typed; top-level raw strings that still
 * decode as JSON coerce to their value (`"25"` becomes `25`, `"null"`
 * becomes `null`) while plain strings pass through unchanged.
 */
export const cliConvexCallArgsSchema = a.record(a.string(), a.pipe(a.unknown(), a.transform(convexCallCliCoerceValue)))
