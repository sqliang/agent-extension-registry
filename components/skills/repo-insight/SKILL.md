---
name: repo-insight
description: 系统分析本地代码仓库的结构、职责、运行链路与风险，并生成可核验的中文洞察报告；适用于仓库接手、架构梳理和技术调研。
---

# Repo Insight

先界定目标仓库、分析深度和输出位置，再按 `references/workflow.md` 的阶段路由执行。默认只读；生成报告或修改源码前必须确认写入范围。

## 快速路由

1. 使用 `scripts/file_counter.py` 建立语言和文件规模基线。
2. 使用 `scripts/complexity_scanner.py` 找到复杂度热点。
3. 阅读入口、配置、依赖和关键业务路径，以代码证据校正脚本结果。
4. 根据任务选择模板：
   - 仓库概览：`references/repo_overview_tpl_guide.md`
   - 目录树：`references/tree_tpl_guide.md`
   - 架构说明：`references/architecture_tpl_guide.md`
   - 最终报告：`references/final_report_tpl_guide.md`
5. 明确区分已验证事实、合理推断和未验证事项。

完整阶段、质量门槛和异常处理见 `references/workflow.md`。不要自动 clone 未授权仓库，不要把分析请求扩展为源码改写。
