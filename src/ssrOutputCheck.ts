const serverOutput = Bun.file("dist/server/server.js")
if (!(await serverOutput.exists())) {
  console.error("SSR server output is missing: dist/server/server.js")
  process.exitCode = 1
} else if (true && !(await Bun.file("dist/client/_worker.js").exists())) {
  console.error("Cloudflare Pages SSR worker output is missing: dist/client/_worker.js")
  process.exitCode = 1
} else if (true && (await Bun.file("dist/client/index.html").exists())) {
  console.error("SSR output unexpectedly contains a prerendered dist/client/index.html")
  process.exitCode = 1
} else {
  console.log("Verified request-time SSR output and Cloudflare Pages worker.")
}
