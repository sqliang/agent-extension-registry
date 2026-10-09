# repo-insight

代码仓库深度分析技能集合，提供两种不同实现方式的 GitHub/本地仓库分析工具。

## 功能概览

两个 Skill 都具备以下能力：

- 🔍 **一键分析** - 支持 GitHub URL 或本地目录分析
- 📊 **深度报告** - 生成项目概述、架构分析、核心模块解读
- 📝 **中文支持** - 自动翻译 README、生成中文代码注释
- 🚀 **全自动执行** - 调用后无需中间交互

---

## 一、设计演进与多场景适配

### 1.1 迭代演进历程

**v1: github-source-decoder（混合架构）**
- 定位：探索性实现，验证仓库分析的可行性
- 架构：Python 脚本层 + Claude 智能层
- 设计思路：脚本处理确定性任务（扫描、克隆、结构化输出），Claude 处理智能分析
- 优点：脚本层提供结构化数据，降低 Claude 出错概率
- 局限：架构复杂，需要维护两套逻辑；扩展性有限

**v2: repo-insight-skill（纯 Agent Skill）**
- 定位：成熟的完整解决方案，面向高质量分析场景
- 架构：纯 Agent Skill，完整的 5+2 阶段工作流
- 设计思路：充分发挥 Claude 的智能，内置质量保障机制
- 优点：架构简洁，可扩展性强；质量 Review + 迭代优化闭环
- 新增能力：subAgent 并行处理、质量检查、多轮迭代优化

### 1.2 多场景适配：不同仓库，不同工具

两个 Skill 并非简单的版本替代关系，而是**针对不同规模/复杂度仓库的互补方案**：

| 仓库类型 | 推荐 Skill | 原因 |
|---------|-----------|------|
| 小型仓库（&lt;100 文件） | github-source-decoder | 轻量快速，脚本预处理足够 |
| 中型仓库（100-500 文件） | 均可 | 看具体需求（速度 vs 质量） |
| 大型/复杂仓库（&gt;500 文件） | repo-insight-skill | 需要完整工作流和质量保障 |
| 架构复杂/设计精巧的仓库 | repo-insight-skill | 需要深度架构梳理和业务对齐 |
| 需要快速预览的仓库 | github-source-decoder | 快速生成概览 |
| 需要高质量、可交付报告的仓库 | repo-insight-skill | 完整报告 + 质量检查 |

---

## 二、使用场景对比

### 2.1 github-source-decoder 适用场景

✅ **适合使用的场景：**
- 快速了解一个新项目的基本情况
- 简单的中文 README 翻译和代码注释
- 中小型工具库/示例项目的分析
- 需要快速生成报告，不追求完美质量
- 仓库结构简单，技术栈单一

❌ **不适合使用的场景：**
- 架构复杂的大型项目
- 需要深度理解业务逻辑和设计思路
- 需要高质量、可用于技术分享的报告
- 多模块、高耦合的复杂系统

### 2.2 repo-insight-skill 适用场景

✅ **适合使用的场景：**
- 深入分析复杂代码库的架构设计
- 理解核心业务逻辑和数据流转
- 生成高质量、可用于技术文档的分析报告
- 大型开源项目或企业级项目的深度解读
- 需要质量保障和迭代优化的分析场景
- 学习优秀的代码设计和架构模式

❌ **不适合使用的场景：**
- 只想快速看一眼项目概览（杀鸡焉用牛刀）
- 超小型项目（&lt;20 文件），可能过度设计
- 只需要简单的中文翻译

---

## 三、未来展望

repo-insight-skill 的设计为未来演进预留了空间：

### 3.1 近期优化（已完成）
- ✅ 优化报告格式和目录结构
- ✅ 增强质量检查和输出规范
- ✅ 完善最终报告的内容完整性

### 3.2 中期规划
- **基于 AST 解析的深度分析**：
  - 使用 tree-sitter 等工具进行精确的 AST 解析
  - 更准确的函数调用关系、类继承关系分析
  - 代码复杂度和可维护性的量化评估

- **增强的代码理解**：
  - 跨文件的数据流追踪
  - 设计模式的自动识别
  - 技术债务和重构建议

### 3.3 长期愿景：Multi-Agent 架构

未来可能将 repo-insight-skill 演进为更复杂的解读系统：

```text
[用户请求]
    |
    v
[协调 Agent (Coordinator)]
    |
    +---> [架构分析 Agent] ---> 整体架构、模块关系
    |
    +---> [代码解析 Agent] ---> AST 解析、调用关系
    |
    +---> [业务理解 Agent] ---> 业务逻辑、领域模型
    |
    +---> [质量审查 Agent] ---> 报告质量、一致性检查
    |
    v
[报告整合与输出]
```

**可能的演进方向：**
1. **作为 SubAgent**：在更大的系统中作为代码分析组件
2. **独立 Agent**：拥有自己的工具集和记忆，持续学习和优化
3. **Multi-Agent 协作**：多个 specialized Agent 分工协作，提供更深度的分析

---

## Skill 对比

### github-source-decoder

**混合架构实现**（脚本 + Claude）

- 适合：简单快速的仓库分析
- 特点：
  - 使用 Python 脚本做仓库预处理和结构化扫描
  - 轻量级，启动快
  - 生成基础分析报告和中文注释

[查看详情 →](./github-source-decoder/README.md)

### repo-insight-skill

**纯 Agent Skill 实现**（更高级）

- 适合：需要深度、高质量分析的场景
- 特点：
  - 完整的 5+2 阶段工作流
  - 内置质量 Review 和迭代优化闭环
  - 支持 subAgent 并行处理复杂模块
  - 生成详尽的架构文档、数据流图、多份分析报告

[查看详情 →](./repo-insight-skill/README.md)

---

## 安装指南

### 前置要求

- Claude Code 已安装并配置好
- `git` - 用于克隆 GitHub 仓库
- `python3` - 用于运行可选辅助脚本

### 安装步骤

#### 1. 克隆仓库

```bash
# 克隆 repo-insight 项目
git clone https://github.com/your-username/repo-insight.git

# 进入目录
cd repo-insight
```

#### 2. 安装 github-source-decoder

```bash
# 方式一：直接使用相对路径（推荐用于本地开发）
# 在 Claude Code 中激活 skill
/skill-add ./github-source-decoder

# 方式二：复制到 Claude Code 的 skills 目录
cp -r github-source-decoder ~/.claude/skills/
```

#### 3. 安装 repo-insight-skill

```bash
# 方式一：直接使用相对路径（推荐用于本地开发）
# 在 Claude Code 中激活 skill
/skill-add ./repo-insight-skill

# 方式二：复制到 Claude Code 的 skills 目录
cp -r repo-insight-skill ~/.claude/skills/
```

#### 4. 验证安装

```bash
# 在 Claude Code 中查看已安装的 skills
/skills
```

安装成功后，你应该能在 skills 列表中看到：
- `github-source-decoder`
- `repo-insight`

### 快速开始

### 选择哪个 Skill？

| 场景 | 推荐 Skill |
|------|-----------|
| 快速了解一个小项目 | github-source-decoder |
| 深入分析复杂代码库 | repo-insight-skill |
| 需要高质量、可迭代的分析 | repo-insight-skill |
| 简单的中文翻译和注释 | github-source-decoder |

### 使用方式

在 Claude Code 中直接说：

```
"帮我分析这个 GitHub 仓库：https://github.com/username/repo"
```

或

```
"分析当前目录的代码"
```

## 项目结构

```
repo-insight/
├── README.md                          # 本文件
├── github-source-decoder/            # 混合架构实现
│   ├── SKILL.md
│   ├── README.md
│   ├── scripts/                       # Python 预处理脚本
│   └── references/
└── repo-insight-skill/                # 纯 Agent Skill 实现
    ├── SKILL.md
    ├── README.md
    ├── scripts/                       # 可选辅助脚本
    ├── references/                    # 报告模板
    └── evals/
```

## 许可证

MIT License
