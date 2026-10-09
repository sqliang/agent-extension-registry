---
name: commit-added
description: 显式调用后，仅检查并提交当前已经暂存的 Git 变更，生成符合项目约定的提交信息；不会暂存额外文件。
---

# Commit Added

仅在用户明确调用本 Skill 并授权提交时执行。

1. 运行 `git status --short`，确认存在已暂存变更。
2. 运行 `git diff --cached --stat` 与 `git diff --cached`，只分析暂存区。
3. 根据仓库约定生成提交信息；没有明确约定时使用 Conventional Commits：`type(scope): summary`。
4. 在提交前向用户展示提交范围和最终 message。若用户尚未明确授权实际提交，先等待确认。
5. 运行 `git commit`，随后报告 commit hash 与摘要。

不得执行 `git add`，不得包含未暂存变更，也不得擅自添加工具署名。
