#!/bin/bash
set -euo pipefail

# Only run in remote Claude Code sessions (web/app), not local CLI
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Install npm dependencies
echo "[session-start] Installing npm dependencies..."
cd "$CLAUDE_PROJECT_DIR"
npm install --prefer-offline 2>&1 | tail -3

# Install gstack if not already present
if [ -d "$HOME/.claude/skills/gstack/bin" ]; then
  echo "[session-start] gstack already installed — skipping"
else
  echo "[session-start] Installing gstack..."

  # git clone is proxy-blocked for external repos in remote sessions — use zip download
  curl -sL "https://github.com/garrytan/gstack/archive/refs/heads/main.zip" \
    -o /tmp/gstack-install.zip

  mkdir -p "$HOME/.claude/skills/gstack"
  unzip -q /tmp/gstack-install.zip -d /tmp/gstack-extract
  mv /tmp/gstack-extract/gstack-main/* "$HOME/.claude/skills/gstack/"
  rm -f /tmp/gstack-install.zip
  rm -rf /tmp/gstack-extract

  cd "$HOME/.claude/skills/gstack" && ./setup --no-prefix 2>&1 | tail -5

  echo "[session-start] gstack installed"
fi

echo "[session-start] Done"
