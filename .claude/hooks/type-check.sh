#!/bin/bash
# PostToolUse hook: Fast type check with tsc --noEmit (faster than nest build)

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only for TypeScript files in src/
if [[ "$FILE_PATH" == */src/*.ts ]]; then
  npx tsc --noEmit 2>&1
  if [ $? -ne 0 ]; then
    echo "TYPE ERROR: TypeScript tip hatasi tespit edildi."
    exit 1
  fi
fi

exit 0
