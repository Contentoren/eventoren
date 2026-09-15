export type OrganizerDataResult<T> =
  | { readonly success: true; readonly data: T }
  | {
      readonly success: false
      readonly errorMessage: string
      readonly errorCode?: string
      readonly errorData?: string
    }
