# Version Safety

## Purpose

Keep one recent rollback point after meaningful project iterations without adding heavy release process.

## Minimal Mechanism

- `main`: normal working branch.
- `backup/latest-safe`: movable branch pointing to the latest validated safe commit.
- `safe/YYYY-MM-DD-<summary>`: immutable tag for a named safe point.

## After A Meaningful Iteration

1. Review scope with `git status --short` and `git diff --stat`.
2. Run the narrowest meaningful validation for the changed surface.
3. Commit the validated changes to `main`.
4. Move `backup/latest-safe` to the new commit.
5. Create a `safe/YYYY-MM-DD-<summary>` tag.

Example:

```powershell
git status --short
git diff --check
git add <changed files>
git commit -m "chore: describe validated iteration"
git branch -f backup/latest-safe HEAD
git tag safe/YYYY-MM-DD-summary
```

## Rollback Use

- Inspect the latest safe point: `git log --oneline backup/latest-safe -1`
- Inspect all safe tags: `git tag --list "safe/*"`
- Recover a file from the latest safe point: `git restore --source backup/latest-safe -- <path>`
- Create a branch from the latest safe point: `git switch -c recovery/from-latest-safe backup/latest-safe`

## Remote Sync

When a remote is configured, push both the backup branch and tags:

```powershell
git push origin main backup/latest-safe --tags
```
