export type OrganizerRouteLoaderData<TPayload = { readonly isServerAuthorized: true }> =
  | {
      readonly authorized: false
    }
  | ({
      readonly authorized: true
    } & TPayload)
