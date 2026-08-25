#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$ROOT"

err() {
  echo "init-agent: $*" >&2
  exit 1
}

require_source_dir() {
  local name="$1"
  local path=".agents/${name}"
  [[ -d "$path" ]] || err "missing source directory: ${path}"
}

symlink_agent_subdir() {
  local parent="$1"
  local sub="$2"
  local dest="${parent}/${sub}"
  local target="../.agents/${sub}"

  mkdir -p "$parent"

  if [[ -L "$dest" ]]; then
    local current
    current="$(readlink "$dest")"
    [[ "$current" == "$target" ]] || err "${dest} points to ${current}, expected ${target}"
    echo "ok: ${dest} -> ${target}"
    return 0
  fi

  [[ ! -e "$dest" ]] || err "${dest} exists and is not a symlink"
  ln -s "$target" "$dest"
  echo "created: ${dest} -> ${target}"
}

link_claude_md() {
  [[ -f AGENTS.md ]] || err "missing AGENTS.md"

  if [[ -L CLAUDE.md ]]; then
    local current
    current="$(readlink CLAUDE.md)"
    [[ "$current" == "AGENTS.md" ]] || err "CLAUDE.md points to ${current}, expected AGENTS.md"
    echo "ok: CLAUDE.md -> AGENTS.md"
    return 0
  fi

  [[ ! -e CLAUDE.md ]] || err "CLAUDE.md exists and is not a symlink"
  ln -s AGENTS.md CLAUDE.md
  echo "created: CLAUDE.md -> AGENTS.md"
}

for sub in skills commands rules; do
  require_source_dir "$sub"
done

for parent in .cursor .claude .codex; do
  for sub in skills commands rules; do
    symlink_agent_subdir "$parent" "$sub"
  done
done

link_claude_md
echo "init-agent: done (cwd: ${ROOT})"

