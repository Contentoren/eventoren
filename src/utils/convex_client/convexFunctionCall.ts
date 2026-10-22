import {
  convexFunctionCatalog,
  type ConvexFunctionCatalogEntry,
  type ConvexFunctionKind,
} from "./convexFunctionCatalog.js"

export type { ConvexFunctionCatalogEntry, ConvexFunctionKind }

export type ConvexFunctionCallTarget = {
  /** Convex module name, e.g. "catalog". Mirrors a file in convex/. */
  readonly module: string
  /** Exported function name within the module. */
  readonly name: string
}

export type ConvexFunctionCallResolved = ConvexFunctionCallTarget & {
  /** "module:name" reference accepted by Convex clients and ctx.run*. */
  readonly functionName: `${string}:${string}`
  readonly kind: ConvexFunctionKind | "internalQuery" | "internalMutation" | "internalAction"
  readonly visibility: "public" | "internal"
  readonly acceptsToken: boolean | null
}

/**
 * Resolves a module/name pair against the generated catalog. Returns
 * undefined for unknown modules or functions so callers can report a
 * not-found error instead of throwing.
 */
export function convexFunctionCallResolve(target: ConvexFunctionCallTarget): ConvexFunctionCallResolved | undefined {
  const moduleEntry = convexFunctionCatalog[target.module]
  const entry: ConvexFunctionCatalogEntry | undefined = moduleEntry?.[target.name]
  if (!entry) return undefined
  return {
    module: target.module,
    name: target.name,
    functionName: `${target.module}:${target.name}`,
    kind: entry.kind,
    visibility: entry.visibility,
    acceptsToken: entry.acceptsToken,
  }
}

export type ConvexFunctionArgs = Record<string, unknown>

/**
 * Applies the caller credential to args when the catalog proves the
 * function accepts a `token` field. Never overwrites an explicit token and
 * never injects when the function is provably tokenless or its shape is
 * unknown, since Convex rejects unexpected args on strict validators.
 */
export function convexFunctionArgsWithToken(
  resolved: ConvexFunctionCallResolved,
  args: ConvexFunctionArgs,
  token: string | undefined,
): ConvexFunctionArgs {
  if (token === undefined || token.length === 0) return args
  if (resolved.acceptsToken !== true) return args
  if ("token" in args) return args
  return { ...args, token }
}

export function convexFunctionCallIsPublic(
  resolved: ConvexFunctionCallResolved,
): resolved is ConvexFunctionCallResolved & { kind: ConvexFunctionKind } {
  return resolved.visibility === "public"
}
