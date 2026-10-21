import * as a from "valibot"

type IntrospectedSchema = {
  type?: string
  entries?: Record<string, a.GenericSchema<unknown>>
  options?: readonly a.GenericSchema<unknown>[]
}

/**
 * Derive an MCP tool input schema from a backend input schema by removing the
 * `token` entry. The bearer credential is resolved by the MCP handler and
 * injected at call time, so tools must not accept it as an argument.
 *
 * `a.omit` does not recurse into `intersect` schemas in the installed Valibot
 * version, so intersects are rebuilt with each token-carrying branch omitted.
 */
export function mcpInputWithoutToken(schema: a.GenericSchema<unknown>): a.GenericSchema<unknown> {
  const internals = schema as unknown as IntrospectedSchema
  if (internals.type === "intersect" && Array.isArray(internals.options)) {
    return a.intersect(
      internals.options.map((option) => mcpInputWithoutToken(option)) as unknown as [
        a.GenericSchema<unknown>,
        a.GenericSchema<unknown>,
      ],
    )
  }
  if (internals.type === "object" && internals.entries && "token" in internals.entries) {
    return a.omit(schema as never, ["token"] as never) as unknown as a.GenericSchema<unknown>
  }
  return schema
}
