#!/bin/bash
# PreToolUse hook: Scan for secrets/credentials in file content before writing

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

# Only check Write and Edit tools
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
  exit 0
fi

# Get the content being written
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Skip .env.example (it's meant to have placeholder values)
if [[ "$FILE_PATH" == *.env.example ]]; then
  exit 0
fi

if [ -z "$CONTENT" ]; then
  exit 0
fi

# Check for common secret patterns
# Anthropic API keys
if echo "$CONTENT" | grep -qE 'sk-ant-[a-zA-Z0-9_-]{20,}'; then
  echo "BLOCKED: Anthropic API key tespit edildi. Secret'lar koda yazilmamali, .env kullanin."
  exit 1
fi

# Generic API keys (long alphanumeric strings assigned to key variables)
if echo "$CONTENT" | grep -qiE '(api_key|apikey|secret_key|secretkey|password)\s*[:=]\s*["\x27][a-zA-Z0-9_\-]{20,}["\x27]'; then
  echo "BLOCKED: Olasi secret/credential tespit edildi. .env dosyasi ve env() kullanin."
  exit 1
fi

# AWS keys
if echo "$CONTENT" | grep -qE 'AKIA[0-9A-Z]{16}'; then
  echo "BLOCKED: AWS Access Key tespit edildi."
  exit 1
fi

# JWT tokens
if echo "$CONTENT" | grep -qE 'eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}'; then
  echo "BLOCKED: JWT token tespit edildi. Token'lar koda yazilmamali."
  exit 1
fi

# Private keys
if echo "$CONTENT" | grep -qE '-----BEGIN (RSA |EC )?PRIVATE KEY-----'; then
  echo "BLOCKED: Private key tespit edildi."
  exit 1
fi

exit 0
