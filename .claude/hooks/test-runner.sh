#!/bin/bash
# PostToolUse hook: Auto-run related test when a service or controller changes

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only for .service.ts and .controller.ts files
if [[ "$FILE_PATH" == *.service.ts || "$FILE_PATH" == *.controller.ts ]]; then
  # Derive the spec file path
  SPEC_PATH="${FILE_PATH%.ts}.spec.ts"

  if [ -f "$SPEC_PATH" ]; then
    echo "Test calisiyor: $SPEC_PATH"
    npx jest "$SPEC_PATH" --passWithNoTests 2>&1
    if [ $? -ne 0 ]; then
      echo "TEST FAILED: $SPEC_PATH basarisiz."
      exit 1
    fi
  fi
fi

exit 0
