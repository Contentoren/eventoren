export const legalErrorCatalog = {
  invalidDocument: {
    code: "legal.invalid-document",
    httpStatus: 400,
    retryable: false,
  },
  documentNotFound: {
    code: "legal.not-found",
    httpStatus: 404,
    retryable: false,
  },
} as const
