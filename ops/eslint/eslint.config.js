import { fileURLToPath } from "node:url"
import convexPlugin from "@convex-dev/eslint-plugin"
import tseslint from "typescript-eslint"

const rootDir = fileURLToPath(new URL("../../", import.meta.url)).replace(/\/$/, "")

const convexFiles = [
  "convex/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}",
  "src/**/convex/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}",
  "src/**/*_convex/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}",
]
const ignoredFiles = [
  "**/_generated/**",
  "**/*.d.ts",
  "**/*.d.mts",
  "**/*.d.cts",
  "**/*.test.*",
  "**/*.spec.*",
  "**/test/**",
  "**/tests/**",
  "**/__tests__/**",
  "**/convex-tests/**",
]

export default [
  { ignores: ignoredFiles },
  ...tseslint.config({
    files: convexFiles,
    extends: [convexPlugin.configs.recommended[0]],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { tsconfigRootDir: rootDir, projectService: true },
    },
    rules: {
      "@convex-dev/no-filter-in-query": "warn",
      "@convex-dev/no-duplicate-indexes": "warn",
      "@convex-dev/no-collect-in-query": "warn",
    },
  }),
]
