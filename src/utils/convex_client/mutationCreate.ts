import type { FunctionArgs, FunctionReference, FunctionReturnType } from "convex/server"
import { useContext } from "solid-js"
import { createResultError, type ResultErr } from "#result"
import { eventorenAuthContext } from "#src/auth/ui/eventorenAuthContext.ts"
import { convexClientContext } from "./convexClientContext.ts"

type TokenMutationArgs<Mutation extends FunctionReference<"mutation">> = Omit<FunctionArgs<Mutation>, "token">

export function mutationCreate<Mutation extends FunctionReference<"mutation">>(
  mutation: Mutation,
): (args: TokenMutationArgs<Mutation>) => Promise<FunctionReturnType<Mutation> | ResultErr> {
  const op = "mutationCreate"
  const client = useContext(convexClientContext)
  const auth = useContext(eventorenAuthContext)
  return async (args) => {
    const token = auth.token()
    if (!client) return createResultError(op, "No Convex client")
    if (!auth.ready() || !token) return createResultError(op, "No validated session token")
    try {
      return await client.mutation(mutation, { ...args, token } as FunctionArgs<Mutation>)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : String(error))
    }
  }
}
