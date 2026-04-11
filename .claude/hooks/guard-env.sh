#!/bin/bash
# PreToolUse hook: Block reading/writing .env files (prevent secret leaks)
# .env.example is allowed

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Check Edit/Write/Read tools
if [[ "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "Write" || "$TOOL_NAME" == "Read" ]]; then
  if [[ "$FILE_PATH" == *.env && "$FILE_PATH" != *.env.example ]]; then
    echo "BLOCKED: .env dosyasina erisim yasaktir. Secret sizintisi onlenmeli. Sadece .env.example duzenlenebilir."
    exit 1
  fi
fi

# Check Bash tool for cat/read/write on .env
if [[ "$TOOL_NAME" == "Bash" ]]; then
  if echo "$COMMAND" | grep -qE '\.env\b' && ! echo "$COMMAND" | grep -qE '\.env\.example'; then
    echo "BLOCKED: Bash ile .env dosyasina erisim yasaktir."
    exit 1
  fi
fi

exit 0
