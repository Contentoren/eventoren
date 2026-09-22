import type { PromiseResult } from "#result"
import { eventorenAuthControlStateCreate } from "#src/auth/ui/eventorenAuthControlStateCreate.ts"
import { errorPageBackNavigate } from "./errorPageBackNavigate.ts"
import { errorPageRefreshExecute } from "./errorPageRefreshExecute.ts"

type AuthControlState = {
  readonly isAuthenticated: ReturnType<typeof eventorenAuthControlStateCreate>["isAuthenticated"]
  readonly logout: (event: SubmitEvent) => Promise<void> | PromiseResult<void>
}

export function errorPageActionsStateCreate(inputs?: {
  readonly fallbackHref?: () => string | undefined
  readonly showSignOut?: () => boolean | undefined
  readonly authControlState?: AuthControlState
  readonly backNavigate?: (options?: { fallbackHref?: string }) => void
  readonly refreshExecute?: () => void
}) {
  const authState = inputs?.authControlState ?? eventorenAuthControlStateCreate()

  const isSignOutVisible = () => {
    const explicit = inputs?.showSignOut?.()
    if (explicit !== undefined) {
      return explicit
    }

    return authState.isAuthenticated()
  }

  const onBack = () => {
    const navigate = inputs?.backNavigate ?? errorPageBackNavigate
    navigate({
      fallbackHref: inputs?.fallbackHref?.(),
    })
  }

  const onRefresh = () => {
    const execute = inputs?.refreshExecute ?? errorPageRefreshExecute
    execute()
  }

  const onSignOut = async (event?: Event) => {
    event?.preventDefault?.()
    await authState.logout(event as SubmitEvent)
  }

  return {
    isSignOutVisible,
    onBack,
    onRefresh,
    onSignOut,
  }
}
