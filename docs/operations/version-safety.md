# 版本安全点

## 用途

为有意义且已经验证的项目迭代保留可回退版本。普通文章产物不纳入版本化，除非用户明确要求。

- `main`：常规工作分支；任务已有隔离分支时保持当前分支，不为安全点切换分支。
- `backup/latest-safe`：指向最近一次通过验证的项目提交。
- `safe/YYYY-MM-DD-<summary>`：不可覆盖的命名安全点标签。

## 迭代完成后

1. 用 `git status --short`、`git diff --stat` 和 `git diff --check` 审查范围，保留预先存在的无关改动。
2. 执行 README 的验证入口，再补本次改动所需的最窄检查；失败未解决时不移动安全点。
3. 只暂存本次已验证改动，在当前分支创建本地提交。
4. 确认 `backup/latest-safe` 未被其他 worktree 检出后，将其移动到新提交，并创建未使用过的安全标签。

```powershell
git worktree list
git add <本次修改文件>
git commit -m "chore: describe validated iteration"
git branch -f backup/latest-safe HEAD
git tag safe/YYYY-MM-DD-summary
```

## 查看与恢复

- 查看最近安全点：`git log --oneline backup/latest-safe -1`
- 查看安全标签：`git tag --list "safe/*"`
- 从安全点创建恢复分支：`git switch -c codex/recovery-from-latest-safe backup/latest-safe`

覆盖恢复文件或删除分支、worktree、旧副本前，先列出具体影响并按项目清理规则取得确认，不直接覆盖未提交工作。

## 远端边界

本地安全点不要求推送。有 remote 不代表已获远端发布授权；只有任务包含远端同步时才推送具体分支与本轮标签，不使用无范围的 `--tags`。向公开仓库推送前使用全局 `safe-open-source-release` skill；没有核实可见性时不能凭仓库名推断私有。

提交、安全点、推送、合并和线上验证分别报告，不能互相替代。
