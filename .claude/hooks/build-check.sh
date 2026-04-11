#!/bin/bash
# PostToolUse hook: Run nest build after file edits to catch compile errors

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only run on TypeScript files in src/
if [[ "$FILE_PATH" == */src/*.ts ]]; then
  npx nest build 2>&1
  if [ $? -ne 0 ]; then
    echo "BUILD FAILED: Derleme hatasi var, duzeltilmeli."
    exit 1
  fi
fi

exit 0
