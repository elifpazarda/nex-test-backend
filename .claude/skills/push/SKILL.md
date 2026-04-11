---
name: push
description: Pushes current branch to remote. Force push is forbidden.
argument-hint: "remote branch (optional)"
disable-model-invocation: true
---

# Git Push Skill

Push commits from the current branch to the remote repository.

## Steps

1. **Pre-check** - Run in parallel:
   - `git status` to check for uncommitted changes
   - `git log --oneline @{u}..HEAD 2>/dev/null || git log --oneline -5` to list commits to be pushed
   - `git branch --show-current` to get the current branch
   - `git remote -v` to verify the remote

2. **Safety checks**:
   - If there are uncommitted changes, warn the user and suggest using `/commit` first
   - If there are no commits to push, report it
   - If pushing directly to `main` or `master`, ask for user confirmation

3. **Push**:
   - If arguments are provided: `git push $ARGUMENTS`
   - Otherwise: `git push -u origin <current-branch>`
   - Use `-u` flag to set upstream tracking

4. **Result**:
   - On success, show a summary (number of commits, which branch)
   - On error (reject, conflict, etc.), explain and suggest a solution

## Rules

- `git push --force` and `git push -f` are strictly forbidden
- User confirmation is required before pushing to `main`/`master`
- If the remote does not exist or there is an access error, explain clearly
