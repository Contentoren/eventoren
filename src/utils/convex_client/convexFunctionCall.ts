import { api } from "#convex/_generated/api.js"
import type { DefaultFunctionArgs, FunctionArgs, FunctionReference, FunctionReturnType } from "convex/server"
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

export type ConvexApi = typeof api
export type ConvexModuleName = keyof ConvexApi & string

/** Any function reference in this app's generated api, with generic args. */
export type AnyConvexFunctionReference = FunctionReference<
  "query" | "mutation" | "action",
  "public" | "internal",
  DefaultFunctionArgs,
  unknown
>

export type ConvexPublicQueryReference = FunctionReference<"query", "public", DefaultFunctionArgs, unknown>
export type ConvexPublicMutationReference = FunctionReference<"mutation", "public", DefaultFunctionArgs, unknown>
export type ConvexPublicActionReference = FunctionReference<"action", "public", DefaultFunctionArgs, unknown>

/**
 * Parses a `<module:function>` reference. Returns undefined when the text
 * does not contain exactly one non-empty module and function part.
 */
export function convexFunctionReferenceParse(text: string): ConvexFunctionCallTarget | undefined {
  const separator = text.indexOf(":")
  if (separator === -1) return undefined
  const module = text.slice(0, separator)
  const name = text.slice(separator + 1)
  if (!module || !name || name.includes(":")) return undefined
  return { module, name }
}

/**
 * Reads the live reference for a catalog-resolved function from the generated
 * api. The generated api is a lazy proxy without enumerable keys, so keyed
 * reads are required. Callers must resolve via convexFunctionCallResolve
 * first: the proxy builds a path for any key, so unknown modules or names
 * are only caught by the catalog check (404/403) before any network call.
 */
export function convexFunctionReferenceLookup(
  resolved: ConvexFunctionCallResolved,
): AnyConvexFunctionReference | undefined {
  const moduleTable: unknown = Reflect.get(api, resolved.module)
  if (typeof moduleTable !== "object" || moduleTable === null) return undefined
  const reference: AnyConvexFunctionReference | undefined = Reflect.get(moduleTable, resolved.name)
  if (typeof reference !== "object" || reference === null) return undefined
  return reference
}

export type ConvexFunctionRunner = {
  readonly query: (reference: ConvexPublicQueryReference, args: DefaultFunctionArgs) => Promise<unknown>
  readonly mutation: (reference: ConvexPublicMutationReference, args: DefaultFunctionArgs) => Promise<unknown>
  readonly action: (reference: ConvexPublicActionReference, args: DefaultFunctionArgs) => Promise<unknown>
}

/**
 * Kind-switched dispatch over a looked-up reference. The reference value is
 * passed through untouched; only its static type narrows per kind. Callers
 * keep the resolve-then-gate ordering (404/403 before any network call).
 */
export async function convexFunctionCallDispatch(
  resolved: ConvexFunctionCallResolved & { kind: ConvexFunctionKind },
  reference: AnyConvexFunctionReference,
  args: DefaultFunctionArgs,
  runner: ConvexFunctionRunner,
): Promise<unknown> {
  switch (resolved.kind) {
    case "query":
      return runner.query(reference as ConvexPublicQueryReference, args)
    case "mutation":
      return runner.mutation(reference as ConvexPublicMutationReference, args)
    case "action":
      return runner.action(reference as ConvexPublicActionReference, args)
  }
}

/** Function exports of one generated api module (non-function values excluded). */
export type ConvexFunctionName<TModule extends ConvexModuleName> = {
  [K in keyof ConvexApi[TModule] & string]: ConvexApi[TModule][K] extends AnyConvexFunctionReference ? K : never
}[keyof ConvexApi[TModule] & string]

export type ConvexReferenceFor<TModule extends ConvexModuleName, TName extends ConvexFunctionName<TModule>> = Extract<
  ConvexApi[TModule][TName],
  AnyConvexFunctionReference
>

/**
 * Statically typed entrypoint: module, name, args and return type are
 * checked at compile time against the generated api. Dynamic (stringly)
 * callers keep using resolve + lookup + dispatch so unknown functions still
 * fail closed with thrown not-found errors.
 */
export async function callConvexFunction<TModule extends ConvexModuleName, TName extends ConvexFunctionName<TModule>>(
  module: TModule,
  name: TName,
  args: FunctionArgs<ConvexReferenceFor<TModule, TName>>,
  runner: ConvexFunctionRunner,
): Promise<FunctionReturnType<ConvexReferenceFor<TModule, TName>>> {
  const resolved = convexFunctionCallResolve({ module, name })
  if (!resolved) throw new Error(`Unknown Convex function "${module}:${name}"`)
  if (!convexFunctionCallIsPublic(resolved)) {
    throw new Error(`Internal Convex function "${module}:${name}" is not agent-reachable`)
  }
  const reference = convexFunctionReferenceLookup(resolved)
  if (!reference) throw new Error(`Missing Convex reference for "${module}:${name}"`)
  const result = await convexFunctionCallDispatch(resolved, reference, args, runner)
  return result as FunctionReturnType<ConvexReferenceFor<TModule, TName>>
}
