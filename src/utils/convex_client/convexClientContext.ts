import type { ConvexClient } from "convex/browser"
import { createContext } from "solid-js"

export const convexClientContext = createContext<ConvexClient | undefined>()
