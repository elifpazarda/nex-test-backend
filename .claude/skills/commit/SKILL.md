---
name: commit
description: Commits changes using Conventional Commits format. Runs lint, type check and test controls.
argument-hint: "commit message (optional)"
disable-model-invocation: true
---

# Git Commit Skill

Analyze current changes and commit following the Conventional Commits v1.0.0 specification.

## Conventional Commits v1.0.0 Specification

### Commit Message Structure

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Specification Rules

1. Commits MUST be prefixed with a type (a noun like `feat` or `fix`), followed by optional scope, optional `!`, and required colon + space.
2. The `feat` type MUST be used when adding a new feature to the application.
3. The `fix` type MUST be used when fixing a bug.
4. A scope MAY follow the type; it must be a noun in parentheses describing a section of the codebase (e.g. `fix(parser):`).
5. A description MUST immediately follow the colon and space after the type/scope prefix.
6. A longer body MAY follow the short description. The body MUST begin one blank line after the description.
7. The body is free-form and MAY consist of multiple newline-separated paragraphs.
8. One or more footers MAY appear one blank line after the body. Each footer consists of a token, `:<space>` or `<space>#` separator, and a string value.
9. Footer tokens MUST use `-` instead of whitespace (e.g. `Acked-by`). Exception: `BREAKING CHANGE` may be used as a token.
10. Breaking changes MUST be indicated in the type/scope prefix or as a footer.
11. When included as a footer, it MUST be uppercase `BREAKING CHANGE:` followed by a space and description.
12. When indicated in the type/scope prefix, `!` MUST be placed immediately before `:`. If `!` is used, `BREAKING CHANGE:` MAY be omitted from the footer.
13. Types other than `feat` and `fix` MAY be used.
14. Information units are NOT case-sensitive, except `BREAKING CHANGE` which MUST be uppercase.
15. `BREAKING-CHANGE` MUST be synonymous with `BREAKING CHANGE`.

### Supported Types

| Type | Description | SemVer |
|------|-------------|--------|
| `feat` | New feature | MINOR |
| `fix` | Bug fix | PATCH |
| `docs` | Documentation only changes | - |
| `style` | Changes that do not affect the meaning of the code (whitespace, formatting, semicolons) | - |
| `refactor` | Code change that neither fixes a bug nor adds a feature | - |
| `perf` | Performance improvement | - |
| `test` | Adding or fixing tests | - |
| `build` | Changes affecting the build system or external dependencies | - |
| `ci` | Changes to CI configuration files and scripts | - |
| `chore` | Other changes that don't modify source or test files | - |
| `revert` | Reverts a previous commit | - |

### Examples

Breaking change with footer:
```
feat: allow provided config object to extend other configs

BREAKING CHANGE: `extends` key in config file is now used for extending other config files
```

Breaking change with `!`:
```
feat!: send an email to the customer when a product is shipped
```

With scope:
```
feat(lang): add Polish language
```

Simple commit (no body):
```
docs: correct spelling of CHANGELOG
```

Multi-paragraph body with multiple footers:
```
fix: prevent racing of requests

Introduce a request id and a reference to latest request. Dismiss
incoming responses other than from latest request.

Remove timeouts which were used to mitigate the racing issue but are
obsolete now.

Reviewed-by: Z
Refs: #123
```

Revert:
```
revert: let us never again speak of the noodle incident

Refs: 676104e, a215868
```

## Steps

1. **Status check** - Run in parallel:
   - `git status` to list changes
   - `git diff` to see staged and unstaged diffs
   - `git log --oneline -5` to check recent commit style

2. **Analyze changes**:
   - Determine the type of changes (new feature, bug fix, refactor, etc.)
   - **Never** stage `.env`, credentials, or secret files — warn the user

3. **Create commit message**:
   - If the user provided an argument, use it: `$ARGUMENTS`
   - Otherwise, generate automatically based on changes
   - Strictly follow the Conventional Commits specification above
   - Choose the appropriate type, add scope if needed
   - **Language: Always English** (both title and body)
   - Short and descriptive title (1 line, focus on "why" not "what")
   - If there is a breaking change, indicate with `!` or `BREAKING CHANGE:` footer
   - **Body is mandatory**: Write details as bullet points listing all changes made

4. **Commit**:
   - Stage relevant files with `git add` (use specific file names, never use `git add .`)
   - Create commit message with HEREDOC:
     ```
     git commit -m "$(cat <<'EOF'
     <type>[scope]: <short description>

     - <detail 1>
     - <detail 2>
     - <detail 3>
     EOF
     )"
     ```
   - Verify commit succeeded with `git status`

5. **On hook failure**:
   - Fix the issue
   - Create a new commit (do not amend)

## Rules

- Never use `git add -A` or `git add .`
- Force push and branch deletion are forbidden
- Files that must never be committed: `.env`, `*.pem`, `*.key`, `credentials*`
- Do not create empty commits (report if there are no changes)
- If changes fit multiple types, split into separate commits when possible
