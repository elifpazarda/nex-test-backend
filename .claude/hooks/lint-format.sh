#!/bin/bash
# PostToolUse hook: Run lint & format after file edits

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only run on TypeScript files
if [[ "$FILE_PATH" == *.ts ]]; then
  npx eslint --fix "$FILE_PATH" 2>/dev/null
  npx prettier --write "$FILE_PATH" 2>/dev/null
fi

exit 0
