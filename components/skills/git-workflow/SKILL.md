---
name: git-workflow
description: Manages full-cycle Git operations including feature branch creation, conventional commit message generation, linear history synchronization (rebase), and push safety checks. Use this for git-related tasks.
license: MIT
metadata:
  author: sqliang
---

# Git Workflow

An expert workflow guide in Git operations for maintaining a clean, linear project history. Covers branch management, commit conventions, code synchronization, conflict resolution, and push workflows.

## When to Apply

Reference these guidelines when:
- Branch management: Creating feature branches, Switching between branches, Merging branches
- Commit conventions: Follow Conventional Commits specification for commit messages.
- Code synchronization
- Conflict resolution
- Push codes


## Core Principles

- **Clean Trunk**: The main branch (main/master) should only contain reviewed and tested code.Never work directly on the main branch.
- **Feature Branches**: Each feature/fix should be developed on a separate branch.
- **Conventional Commits**: Follow Conventional Commits specification for commit messages.
- **Push Policy**: 
    1. Fetch latest remote changes of current branch
    2. Resolve any conflicts that appear 
    3. Run full build and test suite locally  
    4. Only after all checks pass, push to remote current branch
  - Never push directly to main branch. Always create a pull request for code review. 
- **Linear History**: Avoid merge commits. Use rebase or squash to maintain linear history.

## 1. Branch Management Rules

Branch naming conventions:
- `feature/` prefix for new features
- `fix/` prefix for bug fixes
- `hotfix/` prefix for Urgent production fixes
- `release/` prefix for release branches
- Keep names descriptive and kebab-case

**Trigger:** When the user asks to start a new task, fix a bug, or create a branch.

**Action:**
1.  **Identify the Type:** Determine if the task is a `feature`, `fix`, `hotfix`, or `release`.
2.  **Sync First:** BEFORE creating the branch, you MUST ensure the base branch is up-to-date to avoid drift.
3.  **Naming:** Construct the branch name using `kebab-case` with the correct prefix (e.g., `feature/add-user-auth`).

**Command Sequence:**
```bash
# Switch to main branch
git checkout main
# Fetch latest changes from remote
git fetch origin main
# # Critical: Rebase to maintain linear history
git pull --rebase origin main
# Create a new branch
git checkout -b <prefix>/<descriptive-name>
```

## 2. Commit Generation Rules

**Trigger:** When the user asks to commit changes or generate a commit message.

**Constraint:** You MUST follow the **[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)** specification.

**Format:**

```text
<type>(<scope>): <imperative-description>

[optional body explaining 'why' and 'how']

[optional footer like 'Closes #123']

```

**Type Categories:**

* `feat`: New feature
* `fix`: Bug fix
* `docs`: Documentation only
* `style`: Formatting (no code change)
* `refactor`: Code change that neither fixes a bug nor adds a feature
* `test`: Adding missing tests
* `chore`: Maintaince tasks

**Example Commit Message：**
```
feat(auth): add OAuth2 login support

Add OAuth2 login support to the authentication module.

#### Changes
- Add OAuth2 login endpoint
- Update user model to include OAuth2 provider and ID
- Add configuration for OAuth2 clients (e.g., Google, Facebook)

Closes #123
```

**Validation:**
Before suggesting a commit message, verify:

1. Does the type match the changes?
2. Is the description in imperative mood (e.g., "add" not "added")?
3. Does it adhere to the team's project-specific rules (e.g., husky hooks)?

**Using Commitlint with Husky Commit-msg Hook:**

Commitlint has been built-in to the project, and the commit-msg hook has been configured to run commitlint on each commit. If you try to commit with an invalid message, the commit will be aborted.


## 3. Synchronization(The "Always Rebase" Policy) & Conflict Resolution

**Trigger:** When the user needs to sync code or prepare for a push.

**Rule:** NEVER use `git merge` for feature branches. ALWAYS use `rebase` to maintain a linear history.

**Command Sequence:**
```bash
# Fetch latest changes
git fetch origin
# Rebase current branch on top of remote changes
git pull --rebase origin <current-branch>
# If conflicts occur, instruct the user to resolve them, then:
# git add <file> && git rebase --continue
```

**After rebase and resolving conflicts:**
1. Run full build and test suite locally to ensure everything works as expected.
2. Double-check that the changes are correct and don't introduce any regressions.
3. Notify user about the changes and ask for their feedback, and ensure they are happy with the changes.

## 4. Push Safety Protocol

**Trigger:** When code changes are ready to be pushed to the remote repository.

**Safety Check:**
1. If the branch has been rebased (history rewritten), you MUST use `--force-with-lease`.
2. NEVER use raw `--force`.
3. NEVER push directly to `main` or `master`.
4. All tests and build must pass locally before pushing.

**Command Sequence:**
```bash
# Push current branch to remote
git push origin <current-branch-name>
# Force push (use with caution, after rebase)
git push --force-with-lease origin <current-branch-name>
```

## 5. Post-Review Commit Hygiene


**Trigger:** User needs to update code after a Code Review.

**Rule:** Keep history clean, avoid creating multiple "fix review" commits. Do NOT create "fix review" commits.

**Command:**

```bash
git add .
git commit --amend --no-edit  # Or --amend to update message
git push --force-with-lease origin <current-branch>
```

## 6. Code Review Best Practices

### PR Requirements
- [ ] Clear title describing the change
- [ ] Detailed description explaining context and impact
- [ ] Single logical change per PR
- [ ] All CI checks passed
- [ ] At least one reviewer approval

### Review Process
- Review promptly once approved
- Reference [Google's Code Review Guide](https://google.github.io/eng-practices/review/reviewer/)
