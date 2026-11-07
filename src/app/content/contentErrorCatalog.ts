export const contentErrorCatalog = {
  invalidRequest: { code: "content.invalid-request", httpStatus: 400, retryable: false },
  articleNotFound: { code: "content.not-found", httpStatus: 404, retryable: false },
  bodyMissing: { code: "content.body-missing", httpStatus: 500, retryable: false },
} as const
