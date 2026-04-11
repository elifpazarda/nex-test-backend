#!/bin/bash
# PreToolUse hook: Block dangerous bash commands
# - rm (file/directory deletion)
# - git push --force / -f
# - git branch -D / -d
# - git reset --hard
# - git clean -f

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$COMMAND" ]; then
  exit 0
fi

# Block rm commands (any form of deletion)
if echo "$COMMAND" | grep -qE '\brm\b'; then
  echo "BLOCKED: rm komutu yasaktir. Dosya silme islemi manuel yapilmalidir."
  exit 1
fi

# Block git force push
if echo "$COMMAND" | grep -qE 'git\s+push\s+.*(-f|--force)'; then
  echo "BLOCKED: git push --force yasaktir."
  exit 1
fi

# Block git branch delete
if echo "$COMMAND" | grep -qE 'git\s+branch\s+.*(-[dD])'; then
  echo "BLOCKED: git branch silme yasaktir."
  exit 1
fi

# Block git reset --hard
if echo "$COMMAND" | grep -qE 'git\s+reset\s+--hard'; then
  echo "BLOCKED: git reset --hard yasaktir."
  exit 1
fi

# Block git clean -f
if echo "$COMMAND" | grep -qE 'git\s+clean\s+.*-f'; then
  echo "BLOCKED: git clean -f yasaktir."
  exit 1
fi

exit 0
