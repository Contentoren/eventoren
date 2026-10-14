import { afterEach, expect, test } from "bun:test"
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { createRequire } from "node:module"
import { join, resolve } from "node:path"
import { parse } from "dotenv"

const root = resolve(import.meta.dir, "..")
const dotenvPath = createRequire(import.meta.url).resolve("dotenv")
const fixtures: string[] = []
const derived = {
  ASSETS_SERVICE_API_URL: "https://synthetic-assets.invalid",
  ASSETS_SERVICE_PROJECT_ID: "synthetic-project-uuid",
  ASSETS_SERVICE_ENVIRONMENT: "production",
  ASSETS_SERVICE_ACCESS_TOKEN: "synthetic-assets-secret",
}

afterEach(() => {
  for (const fixture of fixtures.splice(0)) rmSync(fixture, { recursive: true, force: true })
})

function fixtureCreate(contents: string, environment = "development", failure = "0") {
  const dir = mkdtempSync("/tmp/opencode/eventoren-convex-env-test-")
  fixtures.push(dir)
  for (const path of ["ops/convex", "bin", "tmp", "home/.config/project-creator/assets/eventoren"]) {
    mkdirSync(join(dir, path), { recursive: true })
  }
  symlinkSync(join(root, "node_modules"), join(dir, "node_modules"))
  for (const file of ["env_update.bash", "envPayloadEncode.ts"]) {
    copyFileSync(join(root, "ops/convex", file), join(dir, "ops/convex", file))
  }
  writeFileSync(join(dir, `.env.${environment}`), contents, { mode: 0o600 })
  const config = join(dir, "home/.config/project-creator/assets/eventoren/assets-cli.env")
  writeFileSync(
    config,
    [
      "ASSETS_API_URL=https://synthetic-assets.invalid/",
      "ASSETS_PROJECT=synthetic-project-selector",
      "ASSETS_ENVIRONMENT=production",
      "ASSETS_TOKEN=synthetic-assets-secret",
    ].join("\n"),
    { mode: 0o600 },
  )
  // The real Bun executes the lookup and encoder. Only Convex is intercepted;
  // preloaded fetch rejects all unexpected URLs, so no API traffic can escape.
  writeFileSync(
    join(dir, "fetchStub.ts"),
    `
    import { appendFileSync } from 'node:fs';
    globalThis.fetch = async (url, options) => {
      if (String(url) !== 'https://synthetic-assets.invalid/api/v1/projects/synthetic-project-selector' ||
          options?.headers?.authorization !== 'Bearer synthetic-assets-secret') {
        throw new Error('Unexpected synthetic lookup');
      }
      if (${JSON.stringify(failure)} === 'lookup') throw new Error('synthetic-assets-secret');
      appendFileSync(process.env.EVENTS, 'lookup\\n');
      return Response.json({ data: { id: 'synthetic-project-uuid' } });
    };
  `,
  )
  writeFileSync(
    join(dir, "fakeConvex.cjs"),
    `
    const fs = require('node:fs');
    const { parse } = require(${JSON.stringify(dotenvPath)});
    const args = process.argv.slice(2);
    const uploadFile = args[args.indexOf('--from-file') + 1];
    const record = { args, uploadFile, mode: fs.statSync(uploadFile).mode & 0o777,
      payload: parse(fs.readFileSync(uploadFile, 'utf8')) };
    fs.appendFileSync(process.env.EVENTS, 'convex\\n');
    fs.appendFileSync(process.env.RECORDS, JSON.stringify(record) + '\\n');
    if (/^\\d+$/.test(process.env.CLI_FAILURE) && process.env.CLI_FAILURE !== '0') {
      console.log('synthetic-secret-from-cli');
      console.error('synthetic-secret-from-cli');
      process.exit(Number(process.env.CLI_FAILURE));
    }
  `,
  )
  writeFileSync(
    join(dir, "bin/bun"),
    `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$@" >> "$ARGUMENTS"
if [[ "$1" == convex ]]; then
  shift
  exec ${JSON.stringify(process.execPath)} "$FAKE_CLI" "$@"
fi
exec ${JSON.stringify(process.execPath)} --preload "$FETCH_STUB" "$@"
`,
    { mode: 0o700 },
  )
  const env = {
    ...process.env,
    HOME: join(dir, "home"),
    ASSETS_CLI_ENV_FILE: config,
    PATH: `${join(dir, "bin")}:${process.env.PATH}`,
    TMPDIR: join(dir, "tmp"),
    FAKE_CLI: join(dir, "fakeConvex.cjs"),
    FETCH_STUB: join(dir, "fetchStub.ts"),
    RECORDS: join(dir, "records"),
    ARGUMENTS: join(dir, "arguments"),
    EVENTS: join(dir, "events"),
    CLI_FAILURE: failure,
  }
  return {
    dir,
    config,
    run: (target = environment) => {
      const child = Bun.spawnSync(["bash", join(dir, "ops/convex/env_update.bash"), target], { cwd: dir, env })
      return { code: child.exitCode, output: child.stdout.toString() + child.stderr.toString() }
    },
    records: () =>
      existsSync(env.RECORDS)
        ? readFileSync(env.RECORDS, "utf8")
            .trim()
            .split("\n")
            .map((line) => JSON.parse(line))
        : [],
    clean: () => expect(readdirSync(join(dir, "tmp"))).toEqual([]),
  }
}

test("development sends exact Bash-parser values once with explicit target and private cleaned payload", () => {
  const fixture = fixtureCreate(
    [
      "# ignored",
      "INVALID-KEY=ignored",
      "not an assignment",
      "CONVEX_SELF_HOSTED_URL=https://synthetic-target.invalid",
      "CONVEX_SELF_HOSTED_ADMIN_KEY=synthetic-admin-secret",
      "CONVEX_SELF_HOSTED_EXTRA=excluded",
      "CONVEX_SITE_URL=excluded",
      "CONVEX_DEPLOY_KEY=synthetic-deploy-secret",
      "CONVEX_DEPLOYMENT=excluded",
      "CONVEX_DEPLOYMENT_TOKEN=synthetic-deployment-token",
      ...[
        "CONVEX",
        "PUBLIC_CONVEX",
        "NEXT_PUBLIC_CONVEX",
        "VITE_CONVEX",
        "REACT_APP_CONVEX",
        "EXPO_PUBLIC_CONVEX",
      ].flatMap((prefix) => [`${prefix}_URL=excluded`, `${prefix}_SITE_URL=excluded`]),
      "export EMPTY=",
      " SPACE = ' padded synthetic secret ' ",
      "HASH=tag#tail",
      "INLINE=plain # retained by the existing parser",
      "EQUALS=one=two",
      "SINGLE=can't",
      "BACKTICK=prefix'`suffix",
      'DOUBLE=say "yes"',
      String.raw`LITERAL=\n\r\t\path`,
      "MIXED=prefix'`\"suffix",
      "DUP=first",
      "DUP=last",
      "FINAL=without-final-newline",
    ].join("\n"),
  )
  const result = fixture.run()
  expect(result.code).toBe(0)
  const records = fixture.records()
  expect(records).toHaveLength(1)
  const record = records[0]
  expect(record.args).toEqual([
    "env",
    "set",
    "--force",
    "--from-file",
    record.uploadFile,
    `--env-file=${fixture.dir}/ops/convex/../../.env.development`,
  ])
  expect(record.mode).toBe(0o600)
  expect(record.payload).toEqual({
    EMPTY: "",
    SPACE: " padded synthetic secret ",
    HASH: "tag#tail",
    INLINE: "plain # retained by the existing parser",
    EQUALS: "one=two",
    SINGLE: "can't",
    BACKTICK: "prefix'`suffix",
    DOUBLE: 'say "yes"',
    LITERAL: String.raw`\n\r\t\path`,
    MIXED: "prefix'`\"suffix",
    DUP: "last",
    FINAL: "without-final-newline",
  })
  const argumentsLog = readFileSync(join(fixture.dir, "arguments"), "utf8")
  for (const value of [
    "synthetic-admin-secret",
    "synthetic-deploy-secret",
    "synthetic-deployment-token",
    ...Object.values(record.payload).filter((value) => value !== ""),
  ]) {
    expect(result.output).not.toContain(value)
    expect(argumentsLog).not.toContain(value)
  }
  fixture.clean()
})

test("production resolves synthetic assets before its single batch and derived values override local duplicates", () => {
  const fixture = fixtureCreate(
    [
      "VALUE=local-value",
      ...Object.keys(derived).map((key) => `${key}=local-shadow-secret`),
      "ASSETS_SERVICE_ACCESS_TOKEN=second-shadow-secret",
    ].join("\n"),
    "production",
  )
  const result = fixture.run()
  expect(result.code).toBe(0)
  const records = fixture.records()
  expect(records).toHaveLength(1)
  const record = records[0]
  expect(record.args).toEqual([
    "env",
    "set",
    "--force",
    "--from-file",
    record.uploadFile,
    `--env-file=${fixture.dir}/ops/convex/../../.env.production`,
  ])
  expect(record.payload).toEqual({ VALUE: "local-value", ...derived })
  expect(record.mode).toBe(0o600)
  expect(readFileSync(join(fixture.dir, "events"), "utf8")).toBe("lookup\nconvex\n")
  for (const secret of ["synthetic-assets-secret", "local-shadow-secret", "second-shadow-secret", "local-value"]) {
    expect(result.output).not.toContain(secret)
    expect(readFileSync(join(fixture.dir, "arguments"), "utf8")).not.toContain(secret)
  }
  fixture.clean()
})

test("empty development selection skips Bun and Convex", () => {
  const fixture = fixtureCreate("# comment\nCONVEX_DEPLOY_KEY=excluded\nCONVEX_SELF_HOSTED_URL=excluded\n")
  expect(fixture.run().code).toBe(0)
  expect(fixture.records()).toEqual([])
  expect(existsSync(join(fixture.dir, "arguments"))).toBe(false)
  fixture.clean()
})

test("production missing, invalid and failing synthetic config sources stop before Convex", () => {
  for (const config of [
    undefined,
    "ASSETS_ENVIRONMENT=development\n",
    "echo synthetic-source-secret\necho synthetic-source-secret >&2\nreturn 17\n",
  ]) {
    const fixture = fixtureCreate("VALUE=synthetic-local-secret\n", "production")
    if (config === undefined) rmSync(fixture.config)
    else writeFileSync(fixture.config, config)
    const result = fixture.run()
    expect(result.code).toBe(3)
    expect(result.output).not.toContain("synthetic-source-secret")
    expect(fixture.records()).toEqual([])
    expect(existsSync(join(fixture.dir, "arguments"))).toBe(false)
    fixture.clean()
  }
})

test("production config credential failure stops before later valid assignments, lookup, encoder, or Convex", () => {
  for (const failure of ["false", 'ASSETS_TOKEN="$(printf synthetic-credential-secret >&2; exit 17)"']) {
    const fixture = fixtureCreate("VALUE=synthetic-local-secret\n", "production")
    const validConfig = readFileSync(fixture.config, "utf8")
    writeFileSync(
      fixture.config,
      [
        "echo synthetic-source-secret",
        "echo synthetic-source-secret >&2",
        failure,
        validConfig,
        'printf later-success > "$HOME/later-success"',
        "true",
      ].join("\n"),
    )
    const result = fixture.run()
    expect(result.code).toBe(3)
    expect(result.output).toBe("error: unable to load assets-service CLI config\n")
    for (const secret of ["synthetic-source-secret", "synthetic-credential-secret", "synthetic-local-secret"]) {
      expect(result.output).not.toContain(secret)
    }
    expect(existsSync(join(fixture.dir, "home/later-success"))).toBe(false)
    expect(fixture.records()).toEqual([])
    expect(existsSync(join(fixture.dir, "arguments"))).toBe(false)
    expect(existsSync(join(fixture.dir, "events"))).toBe(false)
    fixture.clean()
  }
})

test("production lookup failure is secret-safe and cannot partially upload local values", () => {
  const fixture = fixtureCreate("VALUE=synthetic-local-secret\n", "production", "lookup")
  const result = fixture.run()
  expect(result.code).toBe(3)
  expect(result.output).toContain("unable to resolve")
  expect(result.output).not.toContain("synthetic-assets-secret")
  expect(fixture.records()).toEqual([])
  fixture.clean()
})

test("unsupported strings fail without a remote call, value leakage, or a remaining payload", () => {
  const fixture = fixtureCreate('VALID=synthetic-first-secret\nUNSUPPORTED=" a\'`"#synthetic-secret "\n')
  const result = fixture.run()
  expect(result.code).not.toBe(0)
  expect(result.output).toContain("Cannot encode environment key exactly: UNSUPPORTED")
  expect(result.output).not.toContain("synthetic-secret")
  expect(result.output).not.toContain("synthetic-first-secret")
  expect(fixture.records()).toEqual([])
  fixture.clean()
})

test("overwritten unsupported duplicate values do not block the final effective assignment", () => {
  const fixture = fixtureCreate('DUP=" a\'`"#unsupported "\nDUP=last\n')
  expect(fixture.run().code).toBe(0)
  expect(fixture.records()[0].payload).toEqual({ DUP: "last" })
  fixture.clean()
})

test("CLI failure retains its status while hiding CLI output and removing the payload", () => {
  const fixture = fixtureCreate("VALUE=synthetic-secret\n", "development", "23")
  const result = fixture.run()
  expect(result.code).toBe(23)
  expect(result.output).toContain("Convex env sync failed")
  expect(result.output).not.toContain("synthetic-secret")
  expect(fixture.records()).toHaveLength(1)
  fixture.clean()
})

test("invalid target and missing local file fail without Convex", () => {
  const fixture = fixtureCreate("VALUE=local\n")
  expect(fixture.run("invalid").code).toBe(1)
  rmSync(join(fixture.dir, ".env.development"))
  expect(fixture.run().code).toBe(2)
  expect(fixture.records()).toEqual([])
  fixture.clean()
})

test("encoder validates complete stdin before output, including multiline and malformed input", () => {
  const helper = join(root, "ops/convex/envPayloadEncode.ts")
  const encode = (input: string) =>
    Bun.spawnSync([process.execPath, helper], { stdin: Buffer.from(input), cwd: "/tmp/opencode" })
  const valid = encode("MULTILINE\0line one\nline two\0LITERAL\0\\n\\r\0CRLF\0a\r\nb\0")
  expect(valid.exitCode).toBe(0)
  expect(parse(valid.stdout.toString())).toEqual({
    MULTILINE: "line one\nline two",
    LITERAL: String.raw`\n\r`,
    CRLF: "a\r\nb",
  })
  for (const input of ["KEY\0value", "KEY\0", "INVALID-KEY\0value\0", "GOOD\0valid\0BAD\0 a'`\"#secret \0"]) {
    const invalid = encode(input)
    expect(invalid.exitCode).not.toBe(0)
    expect(invalid.stdout.toString()).toBe("")
    expect(invalid.stderr.toString()).not.toContain("#secret")
  }
  expect(encode("").exitCode).toBe(0)
  expect(encode("").stdout.toString()).toBe("")
})
