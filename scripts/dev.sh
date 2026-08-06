#!/usr/bin/env bash

set -euo pipefail

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

if [[ "${1:-}" == "--" ]]; then
  shift
fi

read_env_value() {
  local variable_name="$1"
  if [[ ! -f .env ]]; then
    return
  fi

  sed -n "s/^[[:space:]]*${variable_name}[[:space:]]*=[[:space:]]*//p" .env \
    | tail -n 1 \
    | sed -e 's/^["'\'' ]*//' -e 's/["'\'' ]*$//'
}

provider="${AI_PROVIDER:-$(read_env_value AI_PROVIDER)}"
provider="${provider:-local-proxy}"

web_command="env NODE_OPTIONS=\"--max-old-space-size=512\" pnpm exec next dev"
for argument in "$@"; do
  printf -v quoted_argument '%q' "$argument"
  web_command+=" ${quoted_argument}"
done

if [[ "$provider" != "local-proxy" ]]; then
  echo "AI_PROVIDER=${provider}; starting the Next.js app without the local proxy."
  if (($#)); then
    env NODE_OPTIONS="--max-old-space-size=512" pnpm exec next dev "$@"
  fi
  env NODE_OPTIONS="--max-old-space-size=512" pnpm run dev:web
fi

if ! command -v claude-code-proxy >/dev/null 2>&1; then
  echo "AI_PROVIDER=local-proxy requires the claude-code-proxy command." >&2
  echo "Install or expose raine/claude-code-proxy on PATH, then run pnpm dev again." >&2
  exit 1
fi

proxy_base_url="${CCP_OPENAI_BASE_URL:-$(read_env_value CCP_OPENAI_BASE_URL)}"
proxy_base_url="${proxy_base_url:-http://127.0.0.1:18765/v1}"
proxy_port=""
if [[ "$proxy_base_url" =~ :([0-9]+)(/|$) ]]; then
  proxy_port="${BASH_REMATCH[1]}"
fi
proxy_port="${proxy_port:-18765}"

echo "AI_PROVIDER=local-proxy; starting Next.js and claude-code-proxy on port ${proxy_port}."
env NODE_OPTIONS="--max-old-space-size=512" pnpm exec concurrently \
  --kill-others-on-fail \
  --names app,proxy \
  --prefix-colors cyan,magenta \
  "$web_command" \
  "CCP_CODEX_RESPONSES_API=1 claude-code-proxy serve --no-monitor --port ${proxy_port}"
