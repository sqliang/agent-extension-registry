# repo-insight

专门用于深度分析和解读本地或 GitHub 源代码仓库的 Agent Skill。在 Claude Code 中全自动运行，包含质量 Review、迭代优化闭环、并行处理和 subAgent 支持。

## 特性

- 🔍 **全自动化分析** - 调用后无需中间交互，直接完成所有分析工作
- 📊 **5+2 阶段工作流** - 从零准备到最终交付的完整流程
- 🔄 **迭代反馈闭环** - 质量 Review 发现问题后自动改良计划并解决
- 🚀 **并行处理** - 支持 subAgent 并行处理多个模块
- 📝 **中文支持** - 自动翻译 README 和生成中文注释
- 🎯 **质量保证** - 完整的质量检查和验收标准

## 工作目录结构

当使用 URL 模式时，代码库克隆到固定的 github-sources 目录：
```
~/github-sources/
└── repo-name/
    ├── reports/
    │   ├── 00-planning/
    │   │   └── analysis_plan.md      # 阶段零：分析计划
    │   ├── 01-global-scan/
    │   │   ├── repo_overview.md      # 阶段一：仓库概览
    │   │   └── draft_tree.md          # 阶段一：目录树草稿
    │   ├── 02-architecture/
    │   │   ├── architecture.md        # 阶段二：架构文档
    │   │   └── final_tree.md          # 阶段二：最终目录树
    │   ├── 03-deep-dive/
    │   │   ├── task_queue.md          # 阶段三：任务队列
    │   │   └── comments_draft.md      # 阶段三：注释草稿
    │   ├── 04-quality/
    │   │   ├── quality_review.md      # 阶段4.5：质量审查
    │   │   └── iteration_log.md       # 阶段4.5：迭代日志
    │   ├── final_report.md            # 阶段四：最终报告
    │   ├── execution_summary.md       # 阶段五：执行总结
    │   └── QUICKSTART.md             # 阶段五：快速浏览指南
    ├── README-CN.md（如需要）
    └── [源代码文件（带中文注释）]
```

## 核心工作流

### 阶段零：准备与任务规划
- 运行可选辅助脚本获取基础信息
- 快速扫描仓库规模
- 制定分析计划，定义质量标准和验收条件
- 输出：`reports/00-planning/analysis_plan.md`

### 阶段一：全局扫描
- 物理层过滤干扰项
- 生成草稿目录树并标注职责
- 产品业务心智初始化与选型提取
- README 翻译（如需要）
- 输出：`reports/01-global-scan/draft_tree.md`、`reports/01-global-scan/repo_overview.md`

### 阶段二：架构梳理
- 靶向寻路与入口解析
- 实体识别与拓扑推导
- 架构梳理逆向绘制（ASCII 字符画）
- 核心数据流转时序提取（Mermaid）
- 规范化契约提取
- 输出：`reports/02-architecture/architecture.md`、`reports/02-architecture/final_tree.md`

### 阶段三：微观深度阅读
- 分块调度与任务分配
- 支持并行 subAgent 处理多个模块
- 靶向阅读核心业务逻辑
- 逻辑反推与业务对齐
- 知识资产化，生成注释草案
- 输出：`reports/03-deep-dive/task_queue.md`、`reports/03-deep-dive/comments_draft.md`

### 阶段四：产物组装
- 报告整合为最终深度解读报告
- 物理注释融合到源代码
- 完整性自检
- 输出：`reports/final_report.md`、带中文注释的代码库

### 阶段4.5：质量 Review 与迭代优化
- 完整性检查（对照验收标准）
- 一致性检查（各报告之间）
- 质量反思（问题清单 + 根本原因分析）
- 迭代决策（轻量级修正 / 部分重跑 / 完整迭代）
- 递归 Review 直到满足质量标准
- 输出：`reports/04-quality/quality_review.md`、`reports/04-quality/iteration_log.md`

### 阶段五：交付与总结
- 生成执行总结（时间统计、迭代记录）
- 生成快速浏览指南
- 交付展示
- 输出：`reports/execution_summary.md`、`reports/QUICKSTART.md`

## 技能目录结构

```
repo-insight-skill/
├── SKILL.md                    # 主技能文件
├── scripts/                    # 可选辅助脚本
│   ├── file_counter.py         # 文件统计
│   └── complexity_scanner.py   # 复杂度扫描
├── references/                 # 参考模板
│   ├── repo_overview_tpl_guide.md
│   ├── architecture_tpl_guide.md
│   └── tree_tpl_guide.md
└── evals/                      # 测试用例
    └── evals.json
```

## 使用方式

在 Claude Code 中：

```
"帮我分析这个 GitHub 仓库：https://github.com/..."

或

"分析当前目录的代码"
```

## 触发场景

技能会在以下情况自动触发：
- 用户说"帮我分析这个 GitHub 仓库：https://github.com/..."
- 用户说"分析当前目录的代码"
- 用户要求深度解读代码库架构和业务逻辑
- 用户需要代码仓库的中文翻译和注释

## 依赖要求

- `git` - 用于克隆 GitHub 仓库
- `python3` - 用于运行可选辅助脚本

## 注意事项

1. **全自动执行** - 调用后无需中间交互，直接完成所有分析工作
2. **保持原有代码** - 注释注入时不会破坏原有代码结构
3. **不覆盖原文件** - 翻译文档时生成新文件（如 README-CN.md）
4. **使用 ASCII 图表** - 架构图必须使用 plainText ASCII 字符画
5. **参考模板文件** - 始终使用 references/ 目录下的模板作为输出格式参考
6. **质量优先** - Review 环节发现问题后，按照迭代策略进行优化
7. **避免无限循环** - 最多迭代 2-3 次，或达到质量标准即可停止

## 并行处理策略

### 可并行的环节

- **阶段一内**：配置文件并行读取、目录树生成 + 技术栈识别
- **阶段二内**：架构梳理 + 实体识别、数据流分析 + 接口契约提取
- **阶段三**：多个高复杂度模块的深度阅读（完全并行）
- **阶段4.5内**：不同模块的问题修正（如有多个独立问题）

### 不可并行的环节

- 阶段零 → 阶段一 → 阶段二 → 阶段三 → 阶段四 必须顺序执行
- Review 环节必须在阶段四之后
- 迭代修正后必须再次 Review

## 许可证

MIT License
