import { expect, test } from "bun:test"
import { convexCallEnvFileParse, convexCallUrlResolve } from "./convexCallEnvLoad.js"

test("convexCallEnvFileParse handles quotes, exports, comments", () => {
  const parsed = convexCallEnvFileParse(
    [
      "# comment",
      "",
      "CONVEX_URL=https://convex.example.invalid",
      'export QUOTED="hello world" # trailing',
      "SINGLE='a#b'",
      "EMPTY=",
      "invalid line",
      "EVENTOREN_API_KEY=key-123",
    ].join("\n"),
  )
  expect(parsed).toEqual({
    CONVEX_URL: "https://convex.example.invalid",
    QUOTED: "hello world",
    SINGLE: "a#b",
    EMPTY: "",
    EVENTOREN_API_KEY: "key-123",
  })
})

test("convexCallUrlResolve prefers flag, then env, then file", () => {
  expect(
    convexCallUrlResolve({ flagUrl: "https://flag.invalid", env: { CONVEX_URL: "https://env.invalid" }, fileVars: {} }),
  ).toBe("https://flag.invalid")
  expect(
    convexCallUrlResolve({
      env: { VITE_CONVEX_URL: "https://env.invalid" },
      fileVars: { CONVEX_URL: "https://file.invalid" },
    }),
  ).toBe("https://env.invalid")
  expect(
    convexCallUrlResolve({
      env: { CONVEX_URL: "https://env.invalid" },
      fileVars: { CONVEX_SELF_HOSTED_URL: "https://file.invalid" },
    }),
  ).toBe("https://env.invalid")
  expect(convexCallUrlResolve({ env: {}, fileVars: { CONVEX_SELF_HOSTED_URL: "https://file.invalid" } })).toBe(
    "https://file.invalid",
  )
  expect(convexCallUrlResolve({ env: {}, fileVars: {} })).toBeUndefined()
})
