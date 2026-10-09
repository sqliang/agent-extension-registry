---
name: obsidian-smart-links
description: 针对指定的 Obsidian 笔记，分析知识库构建双向链接（外链+反链），支持段落级链接，自动生成外链详情报告并交互确认后写入。适用于笔记深度整理、知识图谱完善、跨笔记关联建立等场景。
---

# Obsidian Smart Links

为指定的 Obsidian 笔记深度分析链接机会，构建双向连接，支持**段落级链接**。

## 核心能力

- 分析笔记的现有外链和反链
- AI 推理潜在链接机会（不只是关键词匹配）
- 支持三层链接粒度：笔记级 / 章节级 / **段落级**
- 生成结构化外链详情报告，交互确认后写入
- 同时建立正向链接和反向链接（双向连接）

---

## 工作流：分 5 步执行

### Step 1：CLI 侦察（确定目标笔记）

确认目标笔记及其在 vault 中的位置：

```bash
# 列出目标目录的笔记
obsidian files folder="笔记目录" ext=md

# 获取目标笔记的章节结构（含行号，用于段落级链接）
obsidian outline file="笔记名" format=json

# 查看现有外链和反链
obsidian links path="笔记路径"
obsidian backlinks file="笔记名"
```

> 也可以直接指定笔记路径，由当前宿主继续分析。

### Step 2：采集链接数据（显式 Skills）

显式调用配套 Skills 简化脚本调用：

```bash
obsidian-links-status "笔记名"                           # 获取笔记链接现状
obsidian-links-search "笔记名" "关键词"                  # 在 vault 中搜索相关段落
obsidian-links-context "笔记名"                          # 导出完整分析上下文
```

> 等价于从本 Skill 根目录运行：`python3 scripts/analyze_links.py "笔记名" --status`

### Step 3：宿主 Agent 深度分析

宿主 Agent 读取笔记全文和采集数据，深度推理链接机会：

1. **理解笔记主题**：识别核心技术栈、方法论、核心观点
2. **搜索相关笔记**：在 vault 中找出语义相关的笔记
3. **判断链接粒度**：
   - 笔记级：`[[Note]]` — 引用整篇
   - 章节级：`[[Note#Heading]]` — 引用特定章节
   - 段落级：`[[Note#^block-id]]` — 引用具体观点
4. **生成推荐理由**：说明链接价值

详细策略见 [references/LINK_STRATEGIES.md](references/LINK_STRATEGIES.md)。

### Step 4：生成外链详情报告

宿主 Agent 依据 [references/LINK_REPORT_TEMPLATE.md](references/LINK_REPORT_TEMPLATE.md) 生成报告，包含：

- **现有链接状态**：已有哪些外链和反链
- **推荐链接列表**：每个推荐包含理由、插入位置、链接粒度
- **交互确认**：用户逐条确认（Y/n/q）
- **block-id 清单**：段落级链接需要的 block-id

### Step 5：写入链接

宿主 Agent 根据确认结果写入 wikilink：

```markdown
# 章节级链接（直接插入）
Prompts 是即时灵活的对话指令。[[Agent Skills#Skills：可复用的专属能力包]] 则进一步将高频方法固化为可复用能力包。

# 段落级链接（两步操作）
# 步骤 1: 在目标笔记添加 block-id
Agentic 生态系统通过整合 MCP 等组件... ^mcp-ecosystem

# 步骤 2: 在当前笔记插入段落级链接
[[Agent 前沿解读#^mcp-ecosystem]] 详细描述了...
```

---

## 三层链接粒度

| 粒度 | 格式 | 适用场景 |
|------|------|---------|
| 笔记级 | `[[Note]]` | 延伸阅读、引用整篇 |
| 章节级 | `[[Note#Heading]]` | 引用特定章节（宿主 Agent 从 outline 获取 heading） |
| 段落级 | `[[Note#^block-id]]` | 引用具体观点（需先定义 block-id） |

详见 [references/LINK_STRATEGIES.md](references/LINK_STRATEGIES.md)。

---

## 段落级链接的工作流程

段落级链接需要两步操作：

**步骤 1**：在目标笔记的相关段落添加 block-id
```markdown
Agentic 生态系统通过整合 MCP 等组件... ^mcp-ecosystem
```

**步骤 2**：在当前笔记插入段落级链接
```markdown
[[Target Note#^mcp-ecosystem]]
```

宿主 Agent 会生成稳定的 block-id（基于 heading + 段落内容的 hash）。

---

## 双向链接策略

好的链接是双向的。宿主 Agent 在建立链接时会同时考虑：

- **正向链接**：在当前笔记 → 目标笔记
- **反向链接**：在目标笔记的相关位置 → 当前笔记（如果有语义相关性）

---

## 注意事项

- **CLI 侦察不要跳过**：先了解现有链接状态，避免重复建立
- **段落级链接谨慎使用**：只对有独立价值的段落使用，避免标签噪音
- **block-id 稳定性**：基于内容 hash 生成，即使笔记重构也保持有效
- **交互确认不可跳过**：每次写入前必须确认，用户掌控最终结果

---

## 相关文档

- [链接策略参考](references/LINK_STRATEGIES.md)
- [外链报告模板](references/LINK_REPORT_TEMPLATE.md)
