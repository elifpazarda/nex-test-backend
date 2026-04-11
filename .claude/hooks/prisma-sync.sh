#!/bin/bash
# PostToolUse hook: Run prisma generate when schema.prisma changes

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

if [[ "$FILE_PATH" == */schema.prisma ]]; then
  echo "schema.prisma degisti, prisma generate calisiyor..."
  npx prisma generate 2>&1
fi

exit 0
