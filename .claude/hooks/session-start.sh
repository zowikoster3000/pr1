#!/usr/bin/env bash
# Installs dependencies in Claude Code cloud sessions so lint/tests/e2e run immediately.
set -euo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"
pnpm install --frozen-lockfile --reporter=silent
# Cloud sessions ship a pre-installed Chromium; point Playwright at it.
if [ -x /opt/pw-browsers/chromium ] && [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo 'export PW_CHROMIUM_PATH=/opt/pw-browsers/chromium' >> "$CLAUDE_ENV_FILE"
fi
