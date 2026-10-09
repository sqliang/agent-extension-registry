---
name: github-source-decoder
description: 旧版仓库源码解读工作流，仅在用户明确要求使用该遗留能力时运行；新任务应优先使用 repo-insight。
---

# GitHub Source Decoder（已弃用）

本能力仅用于兼容既有流程。新项目请改用 `repo-insight`。

使用前先确认目标是本地仓库还是远程 URL，并获得用户对 clone、生成报告或修改源码的授权。脚本均从当前 Skill 根目录下的 `scripts/` 解析，不依赖固定安装路径。

- `scripts/scanner.py`：生成结构化仓库扫描结果。
- `scripts/analyze_repo.py`：执行旧版分析流程。
- `references/comment-guide.md`：中文注释边界。
- `references/design_v1.0.0.md`：遗留设计说明。

不得把分析请求自动扩展为源码改写；报告输出位置必须由用户或当前项目上下文确定。
