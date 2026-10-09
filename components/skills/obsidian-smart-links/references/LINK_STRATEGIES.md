# Obsidian 链接策略参考

本文档定义 `obsidian-smart-links` skill 中三层链接粒度的使用策略与最佳实践。

---

## 三层链接粒度

| 粒度 | 格式 | 示例 | Obsidian 支持 |
|------|------|------|-------------|
| 笔记级 | `[[Note]]` | `[[Agent 前沿解读]]` | ✅ 原生支持 |
| 章节级 | `[[Note#Heading]]` | `[[Agent 前沿解读#MCP]]` | ✅ 原生支持 |
| 段落级 | `[[Note#^block-id]]` | `[[Agent 前沿解读#^mcp-protocol]]` | ✅ 原生支持（需先定义 block-id） |

---

## 何时用哪种链接

### 笔记级 `[[Note]]`

**适用场景**：
- 引用整篇笔记的核心内容
- 笔记较短（< 500 字），无需精确到章节
- 作为参考文献或延伸阅读

**不适用**：当你想引用笔记中的某个具体观点时。

---

### 章节级 `[[Note#Heading]]`

**适用场景**：
- 想精确引用某个章节或小节的内容
- 目标笔记较长，多个章节讨论不同主题
- 链接目的与特定章节强相关

**生成方式**：
```python
# 从 outline 获取 heading，拼接 [[NoteName#Heading]]
outline = obsidian outline "Agent 前沿解读" format=json
# → [{"heading": "MCP", "line": 180}, ...]
# 拼接：[[Agent 前沿解读#MCP]]
```

**示例**：
```
当前笔记讨论 Agent 的工具调用能力。
→ [[Agent 前沿解读#前沿 1：自主能力及其工具网络效应]]
  更精确地引用了具体的子章节。
```

---

### 段落级 `[[Note#^block-id]]`

**适用场景**：
- 想引用某个具体的观点、数据点或引用
- 段落内容独立性强，值得单独锚定
- 需要在多个位置引用同一个段落实体

**前置条件**：目标笔记中需要先定义 block-id。

**定义 block-id**（两种方式）：

```markdown
# 方式 1：在行末加 ^block-id（推荐）
Agentic 生态系统通过整合 Prompts、Skills、Projects、Subagents 和 MCP 等组件，
将零散能力组织成可持续的工作流。^mcp-ecosystem
```

```markdown
# 方式 2：独立一行
^mcp-ecosystem
```

**block-id 生成规则**：

```python
import hashlib

def make_block_id(heading: str, context: str, max_len: int = 10) -> str:
    """
    生成稳定的 block-id。
    - heading: 所在章节标题（前 4 字）
    - context: 段落内容（前 20 字）
    """
    seed = f"{heading}:{context[:20]}"
    return hashlib.md5(seed.encode()).hexdigest()[:max_len]

# 示例
block_id = make_block_id("MCP：模型上下文", "Agentic 生态系统通过整合")
# → "a3f9c2b1e7"（10 位 hash）
```

**段落级链接的优势**：
- 即使目标笔记重构（移动章节），block-id 保持稳定
- 比行号引用更精确，不受编辑影响
- 适合引用具体的数据点、引用、公式等

---

## 链接推荐判断流程

当分析一篇笔记的潜在链接机会时，按以下流程判断：

```
1. 理解当前笔记的核心主题
   └── 这是什么领域的笔记？

2. 识别笔记中的技术关键词
   └── Agent, MCP, NestJS, SSE ...

3. 在 vault 中搜索相关笔记
   └── 同领域 / 相关技术栈 / 互补主题

4. 对每个候选目标，按以下顺序判断粒度：
   ├── 是否值得单独引用某个章节？→ 章节级
   │   （目标笔记有多个不相关章节时）
   ├── 是否需要引用具体段落？→ 段落级
   │   （该段落有独立价值，如数据点、引用）
   └── 其他 → 笔记级
```

---

## 链接价值评分

每个推荐链接应附带理由。用以下维度评分：

| 维度 | 说明 |
|------|------|
| **语义相关性** | 内容是否相关？（互补、扩展、对比） |
| **深度价值** | 链接是否能帮助读者深入理解？ |
| **双向性** | 是否可以同时建立反向链接？ |
| **粒度匹配** | 链接粒度是否最合适？ |

---

## 段落级链接生成算法

```python
def suggest_paragraph_links(
    outline: list[dict],    # [{"heading": "...", "line": 22}, ...]
    content_lines: list[str],  # 笔记正文（按行分割）
    keywords: list[str],        # 关键词列表
    context_lines: int = 2     # 周围取几行
) -> list[dict]:
    """
    扫描正文，识别含关键词的段落，推荐段落级链接。
    """
    suggestions = []

    for kw in keywords:
        for i, line in enumerate(content_lines):
            if kw.lower() not in line.lower():
                continue

            # 找到关键词所在行
            heading = find_nearest_heading(outline, i)
            block_id = make_block_id(heading, line)

            # 提取上下文
            start = max(0, i - context_lines)
            end = min(len(content_lines), i + context_lines + 1)
            context = content_lines[start:end]

            suggestions.append({
                "keyword": kw,
                "line": i,
                "heading": heading,
                "block_id": block_id,
                "context": context,
            })

    return suggestions
```

---

## 双向链接策略

好的链接是双向的。建立链接时，同时考虑反向链接：

| 操作 | 说明 |
|------|------|
| **正向链接** | 在当前笔记中添加 `[[Target#Heading]]` |
| **反向链接** | 在目标笔记的相关位置添加 block-id（如尚未定义），或添加相关引用 |

**双向链接的判断**：如果 A → B 语义相关，通常 B → A 也有链接价值。

---

## Obsidian CLI 与链接相关的命令

| 命令 | 用途 |
|------|------|
| `obsidian links path="..."` | 获取笔记的所有外链 |
| `obsidian backlinks file="Note"` | 获取所有反链（哪些笔记链接到本笔记） |
| `obsidian outline file="Note" format=json` | 获取章节结构（含 line 号） |
| `obsidian search:context query="keyword" format=json` | 搜索 vault 中的匹配段落 |
| `obsidian unresolved` | 列出所有未解析的链接（可发现断链） |

---

## 扩展指南

当 vault 增长后，可扩展以下规则：

1. **同义词映射**：如 "Agent" 和 "智能体" 视为同一关键词
2. **目录共现分析**：同一目录下的笔记天然相关，优先建立链接
3. **tags 关联**：相同 tags 的笔记可推荐互链
4. **时间衰减**：旧的笔记间链接价值低于新的（知识更迭）
