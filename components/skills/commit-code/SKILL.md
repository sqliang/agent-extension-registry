---
name: commit-code
description: 显式调用后，为已暂存变更生成 Conventional Commit，并在仓库已有 CHANGELOG 规则且用户同意时更新变更日志。
---

# Commit Code

仅在用户明确调用本 Skill 时工作。它只处理已暂存文件，不主动执行 `git add`。

## 流程

1. 用 `git status --short`、`git diff --cached --stat` 和 `git diff --cached` 分析暂存区。
2. 读取仓库贡献指南和最近提交，确定 `type(scope): summary` 的本地约定。
3. 若仓库存在 CHANGELOG 且其规范要求本次变更入档，提出最小更新并展示 diff；不要凭空创建 CHANGELOG。
4. 展示最终提交信息与文件范围。用户未明确授权提交时，先请求确认。
5. 提交后报告 hash；没有暂存变更时安全退出。

常见类型包括 `feat`、`fix`、`docs`、`refactor`、`test`、`chore`、`perf`、`ci` 和 `build`。不得修改未暂存文件来扩大提交范围。
