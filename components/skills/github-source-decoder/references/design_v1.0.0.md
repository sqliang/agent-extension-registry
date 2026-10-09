---
name: GitHub Source Decoder Design v1.0.0
description: 专门用于深度分析和解读本地或 GitHub 源代码仓库的 Agent Skill 设计方案文档。采用脚本层与 Claude 混合架构，记录核心工作流、脚本体系、输出结构、版本变更记录。
version: 1.0.0
last_updated: 2026-04-12
owner: github-source-decoder
---

# GitHub Source Decoder 设计方案

专门用于深度分析和解读本地或 GitHub 源代码仓库的 Agent Skill 设计方案文档。采用脚本层（bash + python）与 Claude 工具调用混合架构，记录核心工作流、脚本体系、输出结构与技术规范。

---

## 版本变更记录

| 版本 | 日期 | 变更说明 |
|------|------|---------|
| 1.0.0 | 2026-03-20 | 初始版本，对齐 SKILL.md v1.0 实现。采用脚本层 + Claude 混合架构，支持 URL 模式和当前目录模式，提供 3 个辅助脚本和完整注释规范指南。 |

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
    │   ├── 分析报告.md
    │   └── README-CN.md（如需要）   # 国际化基建
    └── [源代码文件（带中文注释）]
```

### 当使用当前目录模式时

```
./
├── reports/
│   ├── 分析报告.md
│   └── README-CN.md（如需要）   # 国际化基建
└── [源代码文件（带中文注释）]
```

---

## 核心工作流

github-source-decoder 采用脚本层 + Claude 混合架构：

```
用户调用
    │
    ▼
[脚本层] 仓库准备
    ├─ 确认仓库位置（URL clone 或当前目录）
    ├─ 运行基础扫描
    └─ 输出结构化 JSON
    │
    ▼
[Claude] 智能分析（通过工具调用）
    ├─ 读取脚本输出
    ├─ 制定分析计划
    ├─ 深度分析代码
    ├─ 生成报告和注释
    └─ 写入文件到磁盘
    │
    ▼
完成！输出结果位置
```

### 各层职责

| 层级 | 职责 | 工具 |
|------|------|------|
| 脚本层 | 仓库克隆/定位、文件扫描、结构化数据输出 | bash（github-source-decoder.sh）、Python（analyze_repo.py、scanner.py） |
| Claude 层 | 读取结构化数据、理解代码逻辑、生成报告内容、写入注释到磁盘 | Claude Code 工具调用（Read、Write、Edit、Glob、Grep 等） |

---

## 脚本体系

### github-source-decoder.sh

仓库准备脚本，支持两种模式：

```bash
# URL 模式
scripts/github-source-decoder.sh <GitHub仓库URL> [分支名]

# 当前目录模式
scripts/github-source-decoder.sh
```

输出：结构化 JSON 数据到 stdout

### analyze_repo.py

分析脚本，生成报告模板或输出结构化 JSON：

```bash
# 生成报告模板
python3 scripts/analyze_repo.py <仓库路径>

# 输出结构化 JSON
python3 scripts/analyze_repo.py <仓库路径> --json <输出文件>
```

### scanner.py

代码扫描器，文件分类和复杂度分析：

```bash
python3 scripts/scanner.py <仓库路径>
```

---

## 分析报告内容

生成的报告包含以下 6 大模块：

| 模块 | 内容说明 |
|------|---------|
| 项目概述 | 项目用途、技术栈、主要功能 |
| 架构分析 | 目录结构、模块关系、设计模式 |
| 核心模块 | 关键文件和功能详解 |
| 依赖关系 | 主要依赖库及其用途 |
| 使用指南 | 如何运行、配置、使用 |
| 扩展建议 | 可能的改进方向 |

---

## 注释添加策略

为以下内容添加中文注释：

- 复杂的算法逻辑
- 设计模式的实现
- 关键业务流程
- 不易理解的代码段
- 外部 API 调用

**核心原则**：注释要详尽但不过度，解释"为什么"而不只是"是什么"。

详细规范请参考 `references/comment-guide.md`。

---

## 目录结构

```
github-source-decoder/
├── SKILL.md                          # Skill 定义（含 frontmatter version）
├── README.md                         # 项目说明
├── scripts/
│   ├── github-source-decoder.sh      # 仓库准备脚本（bash）
│   ├── analyze_repo.py              # 分析脚本（输出结构化 JSON）
│   └── scanner.py                   # 代码扫描器
├── references/
│   └── comment-guide.md             # 中文注释添加指南
└── docs/
    └── design_v1.0.0.md             # 版本化设计文档（本文件）
```

---

## 与 repo-insight 的架构对比

| 特性 | github-source-decoder | repo-insight |
|------|----------------------|--------------|
| 架构 | 脚本层 + Claude 混合 | 纯 Claude 工具调用（SKILL.md） |
| 阶段设计 | 无显式分阶段，简单线性流程 | 7 个阶段（阶段零 ~ 阶段五 + 4.2 + 4.5） |
| 输出结构 | 单一 `分析报告.md` | 多阶段 reports/ 子目录分组（00-planning/ ~ 04-quality/） |
| 并行处理 | 无 | subAgent 并行支持 |
| 参考模板 | `references/comment-guide.md`（注释规范） | 4 个结构化模板（repo_overview / architecture / tree / final_report） |
| 辅助脚本 | github-source-decoder.sh / analyze_repo.py / scanner.py | file_counter.py / complexity_scanner.py |
| 质量闭环 | 无 | 阶段4.2（格式检查）+ 阶段4.5（质量迭代） |
| 适用场景 | 轻量级/快速分析 | 大型/复杂仓库深度分析 |

github-source-decoder 可视为 repo-insight 的轻量前身，两者共用同一套注释规范体系（references/comment-guide.md）。
