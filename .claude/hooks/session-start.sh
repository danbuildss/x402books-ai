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

  # Clone via git (zip download is proxy-blocked in remote sessions)
  GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/garrytan/gstack /tmp/gstack-clone 2>&1 | tail -3
  mkdir -p "$HOME/.claude/skills/gstack"
  cp -r /tmp/gstack-clone/. "$HOME/.claude/skills/gstack/"
  rm -rf /tmp/gstack-clone

  cd "$HOME/.claude/skills/gstack" && ./setup --no-prefix 2>&1 | tail -5

  echo "[session-start] gstack installed"
fi

# Link individual gstack skills so they appear when typing / in Claude Code
echo "[session-start] Linking gstack skills..."
gstack_dir="$HOME/.claude/skills/gstack"
skills_dir="$HOME/.claude/skills"
linked=0
for skill_dir in "$gstack_dir"/*/; do
  [ -f "$skill_dir/SKILL.md" ] || continue
  dir_name="$(basename "$skill_dir")"
  [ "$dir_name" = "node_modules" ] && continue
  skill_name=$(grep -m1 '^name:' "$skill_dir/SKILL.md" 2>/dev/null | sed 's/^name:[[:space:]]*//' | tr -d '[:space:]')
  [ -z "$skill_name" ] && skill_name="$dir_name"
  target="$skills_dir/$skill_name"
  mkdir -p "$target"
  [ -L "$target/SKILL.md" ] && rm "$target/SKILL.md"
  ln -snf "$gstack_dir/$dir_name/SKILL.md" "$target/SKILL.md"
  linked=$((linked + 1))
done
echo "[session-start] Linked $linked gstack skills"

echo "[session-start] Done"
