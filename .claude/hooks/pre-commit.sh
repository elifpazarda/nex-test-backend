#!/bin/bash
# PreToolUse hook: Run lint + type check + tests on changed files before git commit

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only trigger on git commit commands
if ! echo "$COMMAND" | grep -qE 'git\s+commit'; then
  exit 0
fi

echo "Pre-commit kontrolleri calisiyor..."

# 1. Lint staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$')

if [ -n "$STAGED_FILES" ]; then
  echo "Lint kontrol ediliyor..."
  echo "$STAGED_FILES" | xargs npx eslint 2>&1
  if [ $? -ne 0 ]; then
    echo "BLOCKED: Lint hatalari var. Commit oncesi duzeltilmeli."
    exit 1
  fi

  echo "Type check yapiliyor..."
  npx tsc --noEmit 2>&1
  if [ $? -ne 0 ]; then
    echo "BLOCKED: TypeScript tip hatalari var."
    exit 1
  fi
fi

# 2. Run tests on changed files
echo "Degisen dosyalarin testleri calisiyor..."
npx jest --onlyChanged --passWithNoTests 2>&1
if [ $? -ne 0 ]; then
  echo "BLOCKED: Testler basarisiz. Commit oncesi duzeltilmeli."
  exit 1
fi

echo "Pre-commit kontrolleri basarili."
exit 0
