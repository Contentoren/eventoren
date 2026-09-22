import { createServerFn } from "@tanstack/solid-start"
import { getRequestProtocol, setResponseHeader } from "@tanstack/solid-start/server"
import { eventorenCurrentUserRead } from "./eventorenCurrentUserRead.ts"
import { eventorenCurrentUserReadFromToken } from "./eventorenCurrentUserReadFromToken.ts"
import { eventorenSessionAdopt } from "./eventorenSessionAdopt.ts"
import { eventorenSessionCookie } from "./eventorenSessionCookie.ts"

type EventorenSessionAdoptInput = {
  readonly token: string
  readonly mode: "legacy" | "replace"
}

export const eventorenSessionAdoptServerFn = createServerFn({ method: "POST" })
  .validator((input: EventorenSessionAdoptInput) => input)
  .handler(({ data }) =>
    eventorenSessionAdopt(data, {
      currentUserRead: eventorenCurrentUserRead,
      candidateRead: eventorenCurrentUserReadFromToken,
      setCookie: (token) =>
        setResponseHeader("set-cookie", eventorenSessionCookie.sessionCreate(token, getRequestProtocol() === "https")),
    }),
  )
