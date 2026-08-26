import { join } from "node:path"

import { parse } from "jsonc-parser"

const WORKER_PREFIX = "webpiano-pr-"
const WORKERS_DEV_SUBDOMAIN = "yamadaasuma"
const MAX_BRANCH_SLUG_LENGTH = 48

function previewWorkerName(branch: string) {
  const slug = branch
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "")
    .slice(0, MAX_BRANCH_SLUG_LENGTH)
    .replaceAll(/-+$/gu, "")

  return `${WORKER_PREFIX}${slug || "branch"}`
}

function previewUrl(branch: string) {
  return `https://${previewWorkerName(branch)}.${WORKERS_DEV_SUBDOMAIN}.workers.dev`
}

function temporaryConfigPath(workerName: string) {
  return join(process.cwd(), `.wrangler-preview-${workerName}-${process.pid}.json`)
}

function currentBranch() {
  const result = Bun.spawnSync(["git", "branch", "--show-current"])
  return result.stdout.toString().trim()
}

const args = process.argv.slice(2)
const printUrlIndex = args.indexOf("--print-url")
const printConfigPathIndex = args.indexOf("--print-config-path")

if (printUrlIndex >= 0) {
  const branch = args.at(printUrlIndex + 1)
  if (!branch) throw new Error("Pass a branch name after --print-url")
  console.log(previewUrl(branch))
  process.exit(0)
}

if (printConfigPathIndex >= 0) {
  const branch = args.at(printConfigPathIndex + 1)
  if (!branch) throw new Error("Pass a branch name after --print-config-path")
  console.log(temporaryConfigPath(previewWorkerName(branch)))
  process.exit(0)
}

const branch = process.env.WORKERS_CI_BRANCH || args.at(0) || currentBranch()

if (!branch || branch === "main") {
  throw new Error("Cloudflare previews require a non-production branch")
}

const workerName = previewWorkerName(branch)
const source = await Bun.file("wrangler.jsonc").text()
const config = parse(source) as Record<string, unknown> & {
  services?: Array<Record<string, unknown> & { binding?: string }>
}

config.name = workerName
config.workers_dev = true
config.preview_urls = false
config.routes = []
config.services = (config.services ?? []).map((service) =>
  service.binding === "WORKER_SELF_REFERENCE" ? { ...service, service: workerName } : service,
)

const temporaryConfig = temporaryConfigPath(workerName)
await Bun.write(temporaryConfig, `${JSON.stringify(config, null, 2)}\n`)

const environment = { ...process.env }
delete environment.WRANGLER_CI_OVERRIDE_NAME

try {
  const deployment = Bun.spawn(
    ["bunx", "wrangler", "deploy", "--config", temporaryConfig, "--minify"],
    {
      env: environment,
      stderr: "inherit",
      stdin: "inherit",
      stdout: "inherit",
    },
  )
  const exitCode = await deployment.exited
  if (exitCode !== 0) process.exit(exitCode)
  console.log(`Cloudflare preview: ${previewUrl(branch)}`)
} finally {
  await Bun.file(temporaryConfig)
    .delete()
    .catch(() => undefined)
}
