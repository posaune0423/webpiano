export {}

const productionCommand = ["bunx", "opennextjs-cloudflare", "deploy"]
const previewCommand = ["bun", "scripts/deploy-cloudflare-preview.ts"]

const branch = process.env.WORKERS_CI_BRANCH
const command = branch && branch !== "main" ? previewCommand : productionCommand

if (process.argv.includes("--print-command")) {
  console.log(command.join(" "))
  process.exit(0)
}

const deployment = Bun.spawn(command, {
  env: process.env,
  stderr: "inherit",
  stdin: "inherit",
  stdout: "inherit",
})

process.exit(await deployment.exited)
