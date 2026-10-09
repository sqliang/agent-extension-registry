# 🧠 Insight Stack Skills

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Insight Stack Skills** 是 Claude Code Agent 技能与工作流的集合，专注于 **Obsidian 笔记知识库管理**，通过 Claude Code AI 能力实现笔记的自动化整理与智能关联。

## 已实现的技能

### 1. `markdown-frontmatter-engine` — 笔记元数据批量管理

批量为 Markdown 文件添加或更新 frontmatter 属性（title, tags, category, type, status）。所有值由 AI 深度语义分析生成，支持无损合并与增量更新。

**核心功能：**
- AI 自动推断 `title`、`tags`、`category`、`type`、`status`
- 已有 tags 自动保留并合并，不丢失信息
- schema/ 目录驱动，支持任意自定义字段
- 无需 Obsidian 环境，通用 Markdown 文件均可用

> 详细用法见 [`skills/markdown-frontmatter-engine/SKILL.md`](skills/markdown-frontmatter-engine/SKILL.md)

---

### 2. `obsidian-smart-links` — 智能双向链接构建

为指定笔记深度分析链接机会，构建双向连接，支持**三层链接粒度**：

| 粒度 | 格式 | 适用场景 |
|------|------|---------|
| 笔记级 | `[[Note]]` | 延伸阅读、引用整篇 |
| 章节级 | `[[Note#Heading]]` | 引用特定章节 |
| 段落级 | `[[Note#^block-id]]` | 引用具体观点 |

**核心功能：**
- AI 推理潜在链接机会（超越关键词匹配）
- 自动生成外链详情报告，交互确认后写入
- 同时建立正向链接和反向链接（双向连接）
- 基于内容 hash 的稳定 block-id，重构后仍有效

> 详细用法见 [`skills/obsidian-smart-links/SKILL.md`](skills/obsidian-smart-links/SKILL.md)

---

## 📁 项目结构

```
insight-stack-skills/
├── skills/                        # 技能定义（Claude Code 可直接调用）
│   ├── markdown-frontmatter-engine/
│   │   ├── SKILL.md              # 技能主文档
│   │   ├── schema/               # 字段定义（一个文件对应一个字段）
│   │   └── scripts/              # Python 批量处理脚本
│   └── obsidian-smart-links/
│       ├── SKILL.md              # 技能主文档
│       ├── references/            # 链接策略与报告模板
│       └── scripts/              # 链接分析脚本
├── commands/                      # Claude Code slash commands（Obsidian 专用）
│   └── obsidian-smart-links/     # obsidian-links-status / search / context
├── docs/                          # 文档与案例研究
│   └── obsidian-smart-links/
└── README.md
```

## 快速开始

### 前提条件

- [Claude Code](https://claude.ai/code) 已安装并登录
- Obsidian vault 已配置（CLI 可用）

### 使用流程

以 `markdown-frontmatter-engine` 为例：

直接在对话中触发，Claude Code 自动运行完整工作流：

```
帮我整理「literature-note」目录下的所有笔记属性
```

## 📚 更多文档

- [Obsidian Smart Links 完整文档](docs/obsidian-smart-links/README.md)
- [Obsidian Smart Links 案例研究](docs/obsidian-smart-links/case-study.md)
