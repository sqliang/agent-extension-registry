---
name: Repo Insight Design v1.0.0
description: 专门用于深度分析和解读本地或 GitHub 源代码仓库的 Agent Skill 设计方案文档。记录核心工作流、阶段设计、输出结构、版本变更记录。
version: 1.0.0
last_updated: 2026-04-08
owner: repo-insight-skill
---

# Repo Insight 设计方案

专门用于深度分析和解读本地或 GitHub 源代码仓库的 Agent Skill 设计方案文档。记录核心工作流、阶段设计、输出结构与技术规范。

---

## 版本变更记录

| 版本 | 日期 | 变更说明 |
|------|------|---------|
| 1.0.0 | 2026-04-12 | 初始版本，对齐 SKILL.md v1.0 实现。引入阶段零（任务规划）、阶段4.2（输出质量检查）、阶段4.5（质量 Review + 迭代优化）、并行处理策略、参考模板体系、可选辅助脚本等新设计。目录结构升级为带版本号的 reports/ 子目录分组。 |

---

## 使用方式

```
"帮我分析这个 GitHub 仓库：https://github.com/..."

或

"分析当前目录的代码"
```

---

## 输出结构

### 当使用 URL 模式时

代码库克隆到固定的 github-sources 目录，或用户指定目录：

```
~/github-sources/
└── repo-name/
    ├── reports/
    │   ├── 00-planning/
    │   │   └── analysis_plan.md      # 阶段零输出
    │   ├── 01-global-scan/
    │   │   ├── repo_overview.md      # 阶段一输出
    │   │   └── draft_tree.md          # 阶段一输出
    │   ├── 02-architecture/
    │   │   ├── architecture.md        # 阶段二输出
    │   │   └── final_tree.md          # 阶段二输出
    │   ├── 03-deep-dive/
    │   │   ├── task_queue.md          # 阶段三输出（subAgent 模式）
    │   │   └── comments_draft.md      # 阶段三输出
    │   ├── 04-quality/
    │   │   ├── quality_review.md      # 阶段4.5输出
    │   │   └── iteration_log.md       # 阶段4.5输出（迭代日志）
    │   ├── final_report.md            # 阶段四输出
    │   ├── execution_summary.md       # 阶段五输出
    │   └── QUICKSTART.md             # 阶段五输出
    ├── README-CN.md（如需要）           # 国际化基建
    └── [源代码文件（带中文注释）]
```

### 当使用当前目录模式时

```
./
├── reports/
│   ├── 00-planning/
│   │   └── analysis_plan.md
│   ├── 01-global-scan/
│   │   ├── repo_overview.md
│   │   └── draft_tree.md
│   ├── 02-architecture/
│   │   ├── architecture.md
│   │   └── final_tree.md
│   ├── 03-deep-dive/
│   │   ├── task_queue.md
│   │   └── comments_draft.md
│   ├── 04-quality/
│   │   ├── quality_review.md
│   │   └── iteration_log.md
│   ├── final_report.md
│   ├── execution_summary.md
│   └── QUICKSTART.md
├── README-CN.md（如需要）
└── [源代码文件（带中文注释）]
```

---

# 2. 核心工作流设计
================================================================================
                      代码库深度解读核心业务工作流设计
================================================================================

【阶段零：准备与任务规划】（新增）
   |
   +-- [输入] : 目标 GitHub 仓库地址 / 原始代码文件集合
   |
   +-- [处理] :
   |      1. 运行可选辅助脚本获取基础信息：
   |         - 可选运行 `scripts/file_counter.py` 获取文件统计（JSON 输出）
   |         - 可选运行 `scripts/complexity_scanner.py` 获取 TOP 10 最复杂文件列表
   |      2. 快速扫描仓库规模：
   |         - 读取 README.md、package.json、pyproject.toml 等核心配置文件
   |         - 使用 Glob 工具快速浏览目录结构
   |      3. 制定分析计划：
   |         - 评估仓库规模和复杂度，确定优先级和并行策略
   |         - 规划哪些任务可以并行执行，预估时间和资源需求
   |         - 定义质量标准和验收条件（如"所有报告必须使用模板格式"）
   |      4. 创建任务清单：
   |         - 生成 `reports/00-planning/analysis_plan.md`
   |         - 包含：任务列表、优先级、依赖关系、质量标准
   |
   +-- [输出] :
   |      [新增] `reports/00-planning/analysis_plan.md` - 分析计划文档（含任务列表、优先级、验收条件）

                               ||
                               \/

【阶段一：全局扫描、输入与信息聚合、产品降维与文档基建】
   |
   +-- [输入] :
   |      - 目标 GitHub 仓库地址 / 原始代码文件集合
   |      - `reports/00-planning/analysis_plan.md`（如存在）
   |
   +-- [处理] :
   |      1. 物理层过滤干扰项：排除第三方依赖包（node_modules/、vendor/、.git/、dist/、build/ 等）、构建产物、环境配置文件等噪音。
   |      2. 结构展平与草稿目录树生成：
   |         - 提取全局文件清单，构建基础的"全局目录层级树"。
   |         - 不仅仅是打印 Tree，而是基于 README 描述或业界通用命名规范，对目录树进行"职责域初步推测标注"，对无法推测的目录打上"待定" Tag。
   |         - 参考 `references/tree_tpl_guide.md` 模板生成 `reports/01-global-scan/draft_tree.md`。
   |      3. 产品视野的业务心智初始化与选型提取：
   |         - 锁定线索：优先扫描 `README.md`、`docs/` 目录、`package.json` 等全局信息。
   |         - 语义提炼：分析该仓库的核心定位、解决的具体痛点、适用的业务场景，并提取/推导典型的使用 Case。
   |         - 选型反推与对比：初步提取其核心技术方案，并分析选择该方案的背景与合理性，且强推导"方案选型对比"（即：为何采用此架构/技术，放弃了哪些替代方案，权衡点是什么）。
   |         - 参考 `references/repo_overview_tpl_guide.md` 模板生成 `reports/01-global-scan/repo_overview.md`。
   |      4. 国际化基建 (Doc Translation)：
   |         - 语言嗅探：检测 README 和 docs 等目录下的核心文档语言。
   |         - 本地化生成：若非中文且无中文版本，触发翻译流，在同级目录生成如 README-CN.md 等对应中文文档，不覆盖原文件。
   |
   +-- [输出] :
   |      1. 含有新增中文翻译文档的增强版目标源码集合。
   |      2. [新增] `reports/01-global-scan/draft_tree.md`: 全局目录树，包含注释草稿，标注职责推测，作为后续阶段的"先验指导上下文"，且可被下个阶段修改。
   |      3. [新增] `reports/01-global-scan/repo_overview.md`：结构化文档 1，包含：定位/问题/场景/Case/方案初探等，能作为后续阶段的"先验指导上下文"，详细模板可参考 `references/repo_overview_tpl_guide.md`。

							   ||
                               \/

【阶段二：宏观视野、架构设计梳理与靶向拓扑】
   |
   +-- [输入] :
   |      1. 目标源码仓库集合 (增强版，带翻译文档)
   |      2. `reports/01-global-scan/draft_tree.md` (全局物理目录与职责推测草稿)
   |      3. `reports/01-global-scan/repo_overview.md` (产品与业务上下文解析文档)
   |      4. `reports/00-planning/analysis_plan.md` (如存在)
   |
   +-- [处理] :
   |      1. 靶向寻路与入口解析：
   |         - 读取 `reports/01-global-scan/draft_tree.md`，提取并解析高价值入口文件（如 package.json、全局 main/index 文件）和打着"待定"标签的神秘目录。
   |         - 重点分析源代码文件，定位系统的全局入口、核心路由分发点、主控中心，可结合 `reports/01-global-scan/repo_overview.md` 的业务场景，带着"业务目的"寻找核心节点。
   |      2. 实体识别与拓扑推导：
   |         - 顺藤摸瓜，扫描入口文件引用的核心模块，梳理模块间的 Import/Export 依赖链路，以及模块 A 是如何调用或依赖模块 B 的。
   |         - 运用领域驱动设计 (DDD) 视角，识别代码中的核心业务实体（如 User, Agent, Order 等）及其在模块间的流转引用。
   |      3. 架构梳理逆向绘制：
   |         - 结合技术栈、源代码分析、模块依赖与上下文文档，综合技术栈与模块依赖，逆向推导整体架构设计与核心模块设计。
   |         - 转换输出格式：将系统整体架构、路由调用关系、实体依赖、核心模块设计(3~5个)等转化为人类易读的 plainText (ASCII 字符画) 图表及较为详尽的文字说明或表格整理。
   |         - 参考 `references/architecture_tpl_guide.md` 模板生成 `reports/02-architecture/architecture.md`。
   |         - **CRITICAL：必须使用 plainText ASCII 字符画绘制结构图，严禁使用 Mermaid 或 Markdown List 代替结构图。**
   |      4. 核心数据流转时序提取 (Data Flow Tracing)：
   |         - 追踪核心场景下的数据是如何从入口输入，经过哪些模块/中间件/拦截器/服务等处理，最终落盘或返回的。提取数据流各节点的交互时序与条件分支。
   |         - 转换输出格式：转换为 Mermaid sequenceDiagram 格式（数据流部分必须且仅能使用 Mermaid）。
   |      5. 规范化契约提取 (Contract Specification)：
   |         - 扫描对外暴露的 Controller/Router 或公共暴露的 API 函数。
   |         - 将提取的参数、返回值、状态码转化为 OpenSpec/OpenAPI 规范标准，内部调用逻辑转化为标准 TypeScript Interface。
   |      6. 实体树收敛：
   |         - 根据源码实际验证结果，推测不同目录对应的业务职责（哪些是核心业务，哪些是通用工具）
   |         - 修正阶段一的目录职责推测，打平未知目录。
   |         - 生成 `reports/02-architecture/final_tree.md`。
   |
   +-- [输出] :
   |      1. [新增] `reports/02-architecture/architecture.md` : 《架构与拓扑梳理文档》，结构化文档2，参考 `references/architecture_tpl_guide.md`。
   |      2. [新增] `reports/02-architecture/final_tree.md` : 经源码验证的最终版目录树。

                               ||
                               \/

【阶段三：微观深度阅读与知识资产化】（增强 subAgent 设计）
   |
   +-- [输入] :
   |      1. 阶段一产物: `reports/01-global-scan/repo_overview.md`
   |      2. 阶段二的所有产物: `reports/02-architecture/architecture.md`、`reports/02-architecture/final_tree.md`
   |      3. 目标源码仓库集合 (增强版，带翻译文档)
   |      4. `reports/00-planning/analysis_plan.md` (如存在)
   |
   +-- [处理] :
   |      1. 分块调度与任务分配：
   |         - 基于 `reports/02-architecture/final_tree.md` 和 complexity_scanner.py 输出
   |         - 将高复杂度模块分成独立任务，每个任务包含：文件路径、优先级、预估复杂度、验收标准
   |         - 生成 `reports/03-deep-dive/task_queue.md`
   |      2. 并行子Agent处理（可并行的任务类型）：
   |         - 不同核心模块的深度阅读
   |         - 不同业务实体的注释生成
   |         - 不同功能模块的业务逻辑分析
   |         - 子Agent任务格式：
   |           ```
   |           深度阅读任务：
   |           - 文件路径：src/core/engine.py
   |           - 优先级：高
   |           - 上下文：repo_overview.md + architecture.md
   |           - 验收标准：[具体质量要求]
   |           - 输出：comments_draft.engine.md
   |           ```
   |         - 合并策略：所有子Agent完成后，合并 comments_draft.*.md 到 comments_draft.md，进行一致性检查
   |      3. 主 Agent 协调：
   |         - 监控任务进度，处理子Agent之间的依赖，质量把关最终合并结果
   |      4. 靶向阅读（如果不使用 subAgent）：
   |         - 从核心入口开始逐级阅读，重点阅读核心业务逻辑、复杂算法、关键设计模式实现
   |      5. 逻辑反推与业务对齐：
   |         - 阅读源码时，不仅解释技术逻辑，还要与阶段一中的 `reports/01-global-scan/repo_overview.md` "业务场景"对齐
   |         - 推导其"解决什么问题"以及"为什么这么写"（例如注释：这里的容错处理是为了应对阶段一提到的高并发场景 Case）
   |      6. 知识资产化：
   |         - 在内部工作区按照目标语言的业界标准，生成针对文件、核心类、复杂函数、难理解的核心逻辑的带规范的拟注入注释草案
   |         - 生成 `reports/03-deep-dive/comments_draft.md`，包含目标文件路径、目前代码内容的注释范围、注释规范与原则等内容
   |
   +-- [输出] :
   |      1. [新增] `reports/03-deep-dive/task_queue.md` - 任务队列（subAgent 模式）
   |      2. [新增] `reports/03-deep-dive/comments_draft.md` - 全量代码注释内容库草案

                               ||
                               \/

【阶段四：产物组装与实体注入】
   |
   +-- [输入] :
   |      - 阶段一的 `reports/01-global-scan/repo_overview.md`
   |      - 阶段二的 `reports/02-architecture/architecture.md` 和 `reports/02-architecture/final_tree.md`
   |      - 阶段三的注释草案（`reports/03-deep-dive/comments_draft.md`）
   |      - 增强版源码
   |      - `reports/00-planning/analysis_plan.md` (如存在)
   |
   +-- [处理] :
   |      1. 报告整合：
   |         - 将阶段一、阶段二、阶段三的所有核心内容无缝融合成最终的《全方位深度解读报告》
   |         - 必须包含 repo_overview.md 的完整内容（项目概览、技术亮点等）
   |         - 必须包含 architecture.md 的完整内容（所有架构图、模块设计、数据流时序图、接口契约等）
   |         - 必须包含 comments_draft.md 的注释规范
   |         - 生成 `reports/final_report.md`，参考 `references/final_report_tpl_guide.md`
   |         - **CRITICAL: 不要只保留高层概述，要保留所有技术细节和图表**
   |      2. 物理注释融合：
   |         - 将注释精准写入代码文件
   |         - 创建备份或使用 git 进行版本控制（如果适用）
   |      3. 完整性自检：
   |         - 校验生成的文档是否覆盖了所有需求点
   |         - 检查注入的注释是否符合预设的注释规范
   |
   +-- [输出] :
   |      1. [新增] `reports/final_report.md` - 《全方位深度解读报告》(业务价值篇 & 架构设计篇)
   |      2. 注入了详尽规范注释的"全新代码库"

                               ||
                               \/

【阶段4.2：输出质量检查】（新增）
   |
   +-- [输入] :
   |      - 阶段零到阶段四的所有输出文件
   |      - `reports/00-planning/analysis_plan.md`
   |
   +-- [处理] :
   |      1. HTML 转义检查：
   |         - 检查所有 Markdown 文件中无 `&gt;`、`&lt;`、`&amp;`
   |         - 确认 `>`、`<`、`&` 都原样保留
   |      2. 目录树格式检查：
   |         - 检查 draft_tree.md 在 ` ```text ` 代码块中
   |         - 检查 final_tree.md 在 ` ```text ` 代码块中
   |         - 检查目录树注释与目录名之间有足够空格（至少2个）
   |         - 检查注释标签格式统一（【核心基建】、【业务模块】、【工具集】、【配置】、【⚠️ 待分析】、【废弃】）
   |      3. 最终报告完整性检查：
   |         - 检查 final_report.md 包含 repo_overview.md 的所有核心内容
   |         - 检查 final_report.md 包含 architecture.md 的所有 ASCII 架构图
   |         - 检查 final_report.md 包含 architecture.md 的所有 Mermaid 时序图
   |         - 检查 final_report.md 包含 architecture.md 的所有接口契约定义
   |         - 检查 final_report.md 有清晰的章节结构和导航
   |      4. 图表规范检查：
   |         - 检查所有 ASCII 图使用统一字符集（+、-、|、>、v、^）
   |         - 检查所有 Mermaid 图语法正确且可渲染
   |         - 检查架构图层次清晰，箭头方向一致
   |
   +-- [输出] :
   |      - 如果检查全部通过：继续阶段 4.5
   |      - 如果发现问题：先修正问题，再继续

                               ||
                               \/

【阶段4.5：质量 Review 与反思 + 迭代优化】（新增）
   |
   +-- [输入] :
   |      - 阶段零到阶段四的所有输出文件
   |      - `reports/00-planning/analysis_plan.md`
   |
   +-- [处理] :
   |      【第一部分：质量 Review】
   |      1. 完整性检查：
   |         - 检查所有应生成的文件是否存在（对照 analysis_plan.md）
   |         - 检查报告格式是否符合模板要求
   |         - 检查关键内容是否缺失（对照 analysis_plan.md 的验收标准）
   |      2. 一致性检查：
   |         - repo_overview.md 与 architecture.md 的业务描述是否一致
   |         - draft_tree.md 与 final_tree.md 的演变是否合理
   |         - 注释与业务场景是否对齐
   |         - 各子模块的注释风格是否统一
   |      3. 质量反思：
   |         - 架构图是否清晰易读，注释是否准确有用，报告是否有遗漏的重要模块
   |         - 生成 `reports/04-quality/quality_review.md`，包含：
   |           - 问题清单（严重程度：高/中/低）
   |           - 根本原因分析
   |           - 改进建议
   |
   |      【第二部分：迭代决策与执行】
   |      4. 问题评估与优先级排序：
   |         - 评估每个问题的影响范围和严重程度
   |         - 确定哪些问题必须解决，哪些可以延后
   |         - 更新 `reports/00-planning/analysis_plan.md`（添加迭代任务）
   |      5. 决定迭代策略：
   |         - 轻量级修正（问题较少且局部）：直接修改相关报告文件，跳过完整阶段重跑
   |         - 部分阶段重跑（问题影响某个阶段）：确定需要重跑的阶段（如阶段二、阶段三），更新该阶段的输入后重新执行
   |         - 完整迭代（问题严重且广泛）：回到阶段零，重新制定分析计划，完整执行所有阶段
   |      6. 执行修正与优化：
   |         - 按照迭代策略执行修正
   |         - 记录所有修改内容到 `reports/04-quality/iteration_log.md`
   |      7. 再次 Review（递归）：
   |         - 修正完成后，回到"质量 Review"步骤
   |         - 检查问题是否解决，是否引入新问题
   |         - 直到满足质量标准或达到最大迭代次数（默认最多2-3次）
   |
   |  【迭代终止条件】
   |      - ✅ 所有严重问题已解决
   |      - ✅ 中等问题已解决或达成共识
   |      - ✅ 达到质量标准
   |      - ⚠️ 或达到最大迭代次数（避免无限循环）
   |
   +-- [输出] :
   |      1. [新增] `reports/04-quality/quality_review.md` - 质量审查报告
   |      2. [新增] `reports/04-quality/iteration_log.md` - 迭代日志（记录所有修改）
   |      3. 更新后的 `reports/00-planning/analysis_plan.md`（包含迭代任务）
   |      4. 优化后的各报告文件

                               ||
                               \/

【阶段五：交付与总结】（增强）
   |
   +-- [输入] :
   |      - 阶段零到阶段4.5的所有输出文件
   |      - 全新代码库（带注释）
   |
   +-- [处理] :
   |      1. 生成最终总结：
   |         - 整合所有阶段的输出
   |         - 生成 `reports/execution_summary.md`
   |         - 包含：时间统计（各阶段耗时）、迭代次数和修改记录、文件清单、关键发现、未解决的问题（如有）、未来优化建议
   |      2. 生成快速预览：
   |         - 创建 `reports/QUICKSTART.md`
   |         - 帮助用户快速浏览分析结果
   |         - 包含：仓库概览、核心架构、关键文件列表
   |      3. 交付展示：
   |         - 生成文件树展示所有输出
   |         - 提供使用建议
   |         - 说明如何阅读各报告
   |
   +-- [输出] :
   |      1. [新增] `reports/execution_summary.md` - 执行总结
   |      2. [新增] `reports/QUICKSTART.md` - 快速浏览指南
   |      3. `reports/04-quality/iteration_log.md` - 迭代日志（如进行了迭代）

================================================================================

# 3. 并行处理策略

## 可并行的环节

| 阶段 | 可并行任务 |
|------|-----------|
| 阶段一内 | 读取 README.md 和 package.json 等配置文件（并行读取）、目录树生成 + 技术栈初步识别 |
| 阶段二内 | 架构梳理 + 实体识别（部分可并行）、数据流分析 + 接口契约提取 |
| 阶段三完全并行 | 多个高复杂度模块的深度阅读（完全并行，由 subAgent 处理） |
| 阶段4.5内（如有多个独立问题） | 不同模块的问题修正 |

## 不可并行（有依赖）的环节

- 阶段零 → 阶段一 → 阶段二 → 阶段三 → 阶段四 必须顺序执行
- 阶段 4.2（输出质量检查）必须在阶段四之后、阶段4.5 之前
- 阶段 4.5（Review + 迭代）必须在阶段 4.2 之后
- 迭代修正后必须再次进入阶段 4.2 和 4.5

================================================================================

# 4. 可选辅助脚本

技能包含以下可选的 Python 辅助脚本（在 scripts/ 目录下），可用于快速获取统计信息：

| 脚本 | 功能 | 用法 |
|------|------|------|
| `scripts/file_counter.py` | 统计文件数量和代码行数 | `python3 scripts/file_counter.py <仓库路径>`，输出 JSON 格式统计信息 |
| `scripts/complexity_scanner.py` | 找出 TOP 10 最复杂文件（基于行数） | `python3 scripts/complexity_scanner.py <仓库路径>`，输出 JSON 格式复杂文件列表 |

这些脚本是可选工具，可以根据需要使用，输出结果可作为阶段零分析规划和阶段三任务分配的参考。

================================================================================

# 5. 参考模板体系

技能包含以下参考模板文件（在 references/ 目录下）：

| 模板文件 | 用途 |
|---------|------|
| `references/repo_overview_tpl_guide.md` | 产品与业务上下文解析报告模板（阶段一输出） |
| `references/tree_tpl_guide.md` | 目录树模板，含格式规范（阶段一、二输出） |
| `references/architecture_tpl_guide.md` | 架构与拓扑梳理文档模板，含图表绘制规范（阶段二输出） |
| `references/final_report_tpl_guide.md` | 最终报告整合模板（阶段四输出） |

在生成对应报告时，务必参考这些模板的格式和内容要求。特别是 final_report.md 必须严格按照 `final_report_tpl_guide.md` 的结构来整合所有阶段的内容。

================================================================================

# 6. 关键输出质量规范

## 6.1 禁止 HTML 实体转义

**CRITICAL: 生成所有 Markdown 文件时，严禁进行任何 HTML 实体转义。**

- ❌ 错误：`&gt;`、`&lt;`、`&amp;`
- ✅ 正确：`>`、`<`、`&`

## 6.2 Markdown 代码块规范

- 目录树、ASCII 图必须放在 ` ```text ` 代码块中
- Mermaid 图必须放在 ` ```mermaid ` 代码块中
- TypeScript/代码必须放在对应语言的代码块中

## 6.3 目录树格式规范

- 注释必须与目录/文件名之间保留至少 2 个空格
- 使用统一的注释标签：【核心基建】、【业务模块】、【工具集】、【配置】、【⚠️ 待分析】、【废弃】
- 整个目录树必须包裹在 ` ```text ` 代码块中

## 6.4 架构图绘制规范

- **CRITICAL：所有结构图（模块关系图、层次结构图等）必须使用 plainText ASCII 字符画**，严禁使用 Mermaid blockDiagram 或 Markdown List 代替
- 数据流时序图**必须且仅能使用** Mermaid sequenceDiagram
- ASCII 字符统一使用：`+`、`-`、`|`、`>`、`v`、`^`

================================================================================

# 7. 与原始草案的对照说明

本版本（v1.0.0）对原始草案进行了以下主要升级：

| 新增/变更 | 说明 |
|---------|------|
| 阶段零（准备与任务规划） | 新增前置规划阶段，引入 analysis_plan.md，确保分析有计划、受控 |
| 阶段4.2（输出质量检查） | 新增格式化与完整性检查节点，在进入深度 Review 前先做格式校验 |
| 阶段4.5（质量 Review + 迭代） | 新增完整的质量审查 → 问题发现 → 计划改良 → 修正执行 → 再审查的闭环 |
| subAgent 并行处理 | 阶段三支持多 subAgent 并行深度阅读，提升大规模仓库处理效率 |
| reports/ 子目录分组 | 目录结构升级为版本化分组（00-planning/、01-global-scan/ 等），便于文件定位 |
| 参考模板体系 | 引入 4 个结构化模板（references/ 目录），统一各阶段输出格式 |
| 可选辅助脚本 | 提供 file_counter.py 和 complexity_scanner.py 作为分析辅助 |
| 并行处理策略 | 显式定义各阶段内可并行与不可并行的环节 |
| 质量规范 | 增加 HTML 转义禁止规则、代码块规范、目录树注释标签体系 |
