export function nativeAuthCatalogueCachePolicyGet(target: "production" | "development") {
  if (target === "production") {
    return {
      first: ["HIT", "MISS"] as const,
      repeated: "HIT" as const,
      isolated: ["HIT", "MISS"] as const,
    }
  }
  return {
    first: ["BYPASS"] as const,
    repeated: "BYPASS" as const,
    isolated: ["BYPASS"] as const,
  }
}
