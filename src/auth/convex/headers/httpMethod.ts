export type HttpMethod = keyof typeof httpMethod

export const httpMethod = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
  OPTIONS: "OPTIONS",
  PATCH: "PATCH",
} as const
