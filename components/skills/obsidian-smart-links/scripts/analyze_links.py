#!/usr/bin/env python3
"""
Obsidian Smart Links Analyzer

分析指定笔记的链接现状，采集外链/反链/章节结构数据，
并导出完整上下文供宿主 Agent 做深度链接推荐。

Usage:
    python3 analyze_links.py <note> --status
    python3 analyze_links.py <note> --search "keyword" --limit 10
    python3 analyze_links.py <note> --export-context

Examples:
    python3 analyze_links.py "1. Agent 前沿解读" --status
    python3 analyze_links.py "1. Agent 前沿解读" --search "MCP" --limit 5
    python3 analyze_links.py "1. Agent 前沿解读" --export-context
"""

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Optional

# ============================================================================
# Obsidian CLI 调用封装
# ============================================================================


def run_obsidian(args: list) -> tuple[str, str, int]:
    """运行 obsidian CLI 命令，返回 (stdout, stderr, returncode)。"""
    cmd = ["obsidian"] + args
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout, result.stderr, result.returncode


def get_existing_links(note_path: str) -> list[dict]:
    """获取笔记的外链列表（正向链接）。"""
    stdout, _, rc = run_obsidian(["links", f"path={note_path}"])
    if rc != 0 or not stdout.strip():
        return []

    links = []
    for line in stdout.strip().split("\n"):
        line = line.strip()
        if line.startswith("[[") and line.endswith("]]"):
            links.append({"type": "note", "target": line[2:-2]})
        elif line.startswith("[[") and "|" in line:
            # [[Note|Display]] format
            match = re.match(r"\[\[([^|\]]+?)\|", line)
            if match:
                links.append({"type": "note", "target": match.group(1)})
        elif "#" in line and line.startswith("[["):
            # [[Note#Heading]] format
            match = re.match(r"\[\[([^#\]]+)#([^\]]+)\]\]", line)
            if match:
                links.append({
                    "type": "section",
                    "target": match.group(1),
                    "heading": match.group(2)
                })
    return links


def get_backlinks(note_name: str) -> list[dict]:
    """获取笔记的反链列表（哪些笔记链接到本笔记）。"""
    stdout, _, rc = run_obsidian(["backlinks", f"file={note_name}", "format=json"])
    if rc != 0 or not stdout.strip():
        return []

    try:
        data = json.loads(stdout)
    except json.JSONDecodeError:
        return []

    backlinks = []
    for item in data if isinstance(data, list) else []:
        backlinks.append({
            "source": item.get("file", item.get("source", "")),
            "context": item.get("context", item.get("line", ""))[:100]
        })
    return backlinks


def get_outline(note_name: str) -> list[dict]:
    """获取笔记的章节结构（含行号，用于段落级链接）。"""
    stdout, _, rc = run_obsidian(["outline", f"file={note_name}", "format=json"])
    if rc != 0 or not stdout.strip():
        return []

    try:
        data = json.loads(stdout)
    except json.JSONDecodeError:
        return []

    outline = []
    for item in data:
        outline.append({
            "level": item.get("level", 1),
            "heading": item.get("heading", ""),
            "line": item.get("line", 0)
        })
    return outline


def search_vault(
    query: str,
    folder: Optional[str] = None,
    limit: int = 10
) -> list[dict]:
    """在 vault 中搜索关键词，返回匹配段落（含行号）。"""
    args = ["search:context", f"query={query}", f"limit={limit}", "format=json"]
    if folder:
        args.append(f"path={folder}")

    stdout, _, rc = run_obsidian(args)
    if rc != 0 or not stdout.strip():
        return []

    try:
        data = json.loads(stdout)
    except json.JSONDecodeError:
        return []

    results = []
    for item in data:
        matches = item.get("matches", [])
        for m in matches:
            results.append({
                "file": item.get("file", ""),
                "line": m.get("line", 0),
                "text": m.get("text", "")[:200]
            })
    return results


def get_file_content(note_path: str, max_lines: int = 0) -> tuple[str, list[str]]:
    """
    读取笔记文件内容。
    返回 (content, lines)，lines 为按行分割的列表。
    """
    p = Path(note_path)
    if not p.exists():
        return "", []

    content = p.read_text(encoding="utf-8")
    lines = content.split("\n")
    return content, lines[:max_lines] if max_lines > 0 else lines


def get_note_path(note_name: str) -> Optional[str]:
    """根据笔记名推测文件路径（先精确匹配，再模糊匹配）。"""
    # 去掉 .md 后缀
    name = note_name.replace(".md", "")

    # 尝试作为精确路径
    p = Path(name)
    if p.exists():
        return str(p)

    # 搜索 vault 中匹配文件
    stdout, _, _ = run_obsidian(["files", "ext=md"])
    for line in stdout.strip().split("\n"):
        line = line.strip()
        if name in line or line.endswith(f"/{name}.md") or line.endswith(f"/{name}"):
            return line

    return None


# ============================================================================
# 段落级链接生成
# ============================================================================


def make_block_id(heading: str, context: str, max_len: int = 10) -> str:
    """生成稳定的 block-id。"""
    seed = f"{heading}:{context[:30]}"
    return hashlib.md5(seed.encode()).hexdigest()[:max_len]


def suggest_paragraph_links(
    outline: list[dict],
    content_lines: list[str],
    keyword: str,
    context_lines: int = 2
) -> list[dict]:
    """
    根据关键词在正文中搜索匹配段落，推荐段落级链接。

    outline: [{"heading": "...", "line": 22}, ...]
    content_lines: 笔记正文（按行分割）
    keyword: 关键词
    context_lines: 周围取几行作为上下文

    返回段落级链接建议列表。
    """
    suggestions = []

    for i, line in enumerate(content_lines):
        if keyword in line:
            # 找到关键词所在行
            heading = find_containing_heading(outline, i)
            block_id = make_block_id(heading, line)

            # 提取周围上下文
            start = max(0, i - context_lines)
            end = min(len(content_lines), i + context_lines + 1)
            context = "\n".join(content_lines[start:end])

            suggestions.append({
                "keyword": keyword,
                "line": i,
                "heading": heading,
                "block_id": block_id,
                "context": context,
                "target_line": line.strip()[:80]
            })

    return suggestions


def find_containing_heading(outline: list[dict], target_line: int) -> str:
    """找到 target_line 所在或前一个最近的 heading。"""
    current_heading = ""
    for item in outline:
        if item["line"] <= target_line:
            current_heading = item["heading"]
        else:
            break
    return current_heading


def get_heading_for_link(outline: list[dict], target_line: int) -> Optional[str]:
    """获取 target_line 之后最近的 heading（用于正向链接）。"""
    next_heading = None
    for item in outline:
        if item["line"] > target_line:
            next_heading = item["heading"]
            break
    return next_heading


# ============================================================================
# 上下文导出
# ============================================================================


def build_export_context(
    note_name: str,
    note_path: str,
    outline: list[dict],
    existing_links: list[dict],
    backlinks: list[dict],
    content: str,
    search_results: list[dict],
    keyword_suggestions: list[dict]
) -> str:
    """构建导出给宿主 Agent 的完整分析上下文。"""

    # 提取笔记摘要（前 40 行）
    lines = content.split("\n")
    first_lines = "\n".join(lines[:40])

    # 提取技术关键词（用于后续搜索）
    keywords = extract_keywords(content)

    sections = [
        f"# 笔记链接分析上下文\n",
        f"**目标笔记**：{note_name}",
        f"**文件路径**：{note_path}",
        f"**分析时间**：{__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M')}",
        f"\n---\n",
        f"## 一、现有链接状态\n",
        f"### 外链（共 {len(existing_links)} 个）\n",
    ]

    if existing_links:
        sections.append("| 类型 | 目标 | 章节 |")
        sections.append("|------|------|------|")
        for link in existing_links:
            sections.append(f"| {link.get('type', 'note')} | {link.get('target', '')} | {link.get('heading', '—')} |")
    else:
        sections.append("（无现有外链）")

    sections.extend([
        f"\n### 反链（共 {len(backlinks)} 个）\n",
    ])

    if backlinks:
        for bl in backlinks:
            source = bl.get("source", "")
            context = bl.get("context", "")[:80]
            sections.append(f"- **{source}** — 引用：\"{context}...\"")
    else:
        sections.append("（无现有反链）")

    sections.extend([
        f"\n## 二、笔记章节结构\n",
        f"```json",
        json.dumps(outline, ensure_ascii=False, indent=2),
        f"```\n",
        f"## 三、笔记摘要（前 40 行）\n",
        f"```\n{first_lines}\n```\n",
    ])

    if keywords:
        sections.extend([
            f"## 四、提取的技术关键词\n",
            f"`{'`, `'.join(keywords)}`\n",
        ])

    if keyword_suggestions:
        sections.extend([
            f"## 五、段落级链接机会（关键词：{keyword_suggestions[0].get('keyword', '')} 等）\n",
            f"```json",
            json.dumps(keyword_suggestions[:10], ensure_ascii=False, indent=2),
            f"```\n",
        ])

    if search_results:
        sections.extend([
            f"## 六、vault 中相关段落匹配\n",
        ])
        for r in search_results[:10]:
            sections.append(f"**{r['file']}** (行 {r['line']}):")
            sections.append(f"> {r['text']}")
            sections.append("")

    sections.extend([
        f"\n---\n",
        f"## 七、给宿主 Agent 的分析指令\n",
        f"请基于以上信息，分析该笔记的潜在链接机会：\n",
        f"1. 识别哪些相关笔记可以建立外链/反链",
        f"2. 判断链接粒度：笔记级、章节级、还是段落级",
        f"3. 确定最佳插入位置和理由",
        f"4. 对段落级链接，列出需要的 block-id（如尚未定义）",
        f"\n请输出外链详情报告，包含每个推荐链接的理由和插入建议。\n",
    ])

    return "\n".join(sections)


def extract_keywords(content: str, top_n: int = 20) -> list[str]:
    """从内容中提取技术关键词（简化版，基于常见模式）。"""
    tech_patterns = [
        r"\bClaude Code\b", r"\bClaude-Code\b", r"\bAgent\b", r"\bAI Agent\b",
        r"\bMCP\b", r"\bSubagent\b", r"\bDeerFlow\b", r"\bOpenClaw\b",
        r"\bNestJS\b", r"\bReact\b", r"\bNextJS\b", r"\bVitest\b",
        r"\bTailwindCSS\b", r"\bSSE\b", r"\bWebSocket\b",
        r"\bHarness Engineering\b", r"\bHarness\b", r"\bCodex\b",
        r"\bSpec Coding\b", r"\bSDD\b", r"\bOpenSpec\b",
        r"\bContext Engineering\b", r"\bZettelkasten\b",
        r"\bRxJS\b", r"\bNeo4j\b", r"\bKnowledge Graph\b",
    ]

    keywords = []
    for pattern in tech_patterns:
        if re.search(pattern, content, re.IGNORECASE):
            kw = re.search(pattern, content, re.IGNORECASE).group(0)
            if kw not in keywords:
                keywords.append(kw)

    return keywords[:top_n]


# ============================================================================
# CLI 输出格式化
# ============================================================================


def format_status_output(
    note_name: str,
    existing_links: list[dict],
    backlinks: list[dict],
    outline: list[dict]
) -> str:
    """格式化 --status 输出。"""
    lines = [
        f"📊 笔记链接分析：{note_name}\n",
        f"外链：{len(existing_links)} 个 | 反链：{len(backlinks)} 个 | 章节：{len(outline)} 个\n",
        f"\n{'='*50}",
        f"\n🔗 外链列表（{len(existing_links)}）\n",
    ]

    if existing_links:
        for link in existing_links:
            t = link.get("target", "")
            lt = link.get("type", "note")
            h = link.get("heading", "")
            lines.append(f"  [{lt}] {t}" + (f" → #{h}" if h else ""))
    else:
        lines.append("  （无）")

    lines.extend([f"\n🔙 反链列表（{len(backlinks)}）\n"])

    if backlinks:
        for bl in backlinks:
            src = bl.get("source", "")
            ctx = bl.get("context", "")[:60]
            lines.append(f"  ← {src}")
            lines.append(f"    \"{ctx}...\"")
    else:
        lines.append("  （无）")

    lines.extend([f"\n📑 章节结构（{len(outline)} 个 heading）\n"])

    if outline:
        for item in outline:
            indent = "  " * (item["level"] - 1)
            lines.append(f"  {indent}[L{item['level']}] {item['heading']} (line {item['line']})")
    else:
        lines.append("  （无）")

    return "\n".join(lines)


def format_search_output(results: list[dict], query: str) -> str:
    """格式化 --search 输出。"""
    lines = [
        f"🔍 搜索结果：\"{query}\"（共 {len(results)} 条）\n",
    ]

    for r in results:
        lines.append(f"📄 {r['file']} (行 {r['line']})")
        lines.append(f"   {r['text']}")
        lines.append("")

    return "\n".join(lines)


# ============================================================================
# 主入口
# ============================================================================


def main():
    parser = argparse.ArgumentParser(
        description="Obsidian Smart Links 分析工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("note", help="笔记名或文件路径")
    parser.add_argument(
        "--status", "-s", action="store_true",
        help="获取笔记链接现状（外链 + 反链 + 章节结构）"
    )
    parser.add_argument(
        "--search", action="store",
        help="在 vault 中搜索关键词"
    )
    parser.add_argument(
        "--limit", "-n", type=int, default=10,
        help="搜索结果数量限制（默认: 10）"
    )
    parser.add_argument(
        "--export-context", "-e", action="store_true",
        help="导出完整分析上下文（供宿主 Agent 使用）"
    )
    parser.add_argument(
        "--json", "-j", action="store_true",
        help="输出 JSON 格式"
    )
    parser.add_argument(
        "--folder", "-f", default="2.literature-note",
        help="搜索范围文件夹（默认: 2.literature-note）"
    )

    args = parser.parse_args()

    # 获取笔记路径
    note_path = get_note_path(args.note)
    if not note_path:
        print(f"错误: 找不到笔记 '{args.note}'", file=sys.stderr)
        sys.exit(1)

    note_name = Path(note_path).stem

    if args.status:
        # 采集所有链接数据
        existing_links = get_existing_links(note_path)
        backlinks = get_backlinks(note_name)
        outline = get_outline(note_name)

        if args.json:
            print(json.dumps({
                "note": note_name,
                "path": note_path,
                "existing_links": existing_links,
                "backlinks": backlinks,
                "outline": outline,
            }, ensure_ascii=False, indent=2))
        else:
            print(format_status_output(note_name, existing_links, backlinks, outline))

    elif args.search:
        results = search_vault(args.search, folder=args.folder, limit=args.limit)
        if args.json:
            print(json.dumps(results, ensure_ascii=False, indent=2))
        else:
            print(format_search_output(results, args.search))

    elif args.export_context:
        # 导出完整上下文
        existing_links = get_existing_links(note_path)
        backlinks = get_backlinks(note_name)
        outline = get_outline(note_name)
        content, content_lines = get_file_content(note_path)

        # 提取关键词并搜索相关段落
        keywords = extract_keywords(content)
        search_results = []
        keyword_suggestions = []

        if keywords:
            # 搜索最相关的几个关键词
            for kw in keywords[:5]:
                search_results.extend(
                    search_vault(kw, folder=args.folder, limit=5)
                )
            # 段落级链接建议（用第一个关键词示例）
            if keywords and content_lines:
                keyword_suggestions = suggest_paragraph_links(
                    outline, content_lines, keywords[0]
                )

        ctx = build_export_context(
            note_name=note_name,
            note_path=note_path,
            outline=outline,
            existing_links=existing_links,
            backlinks=backlinks,
            content=content,
            search_results=search_results[:20],
            keyword_suggestions=keyword_suggestions
        )
        print(ctx)

    else:
        # 默认行为：显示 --status
        existing_links = get_existing_links(note_path)
        backlinks = get_backlinks(note_name)
        outline = get_outline(note_name)
        print(format_status_output(note_name, existing_links, backlinks, outline))
        print("\n（如需更多操作，请加 --search <关键词> 或 --export-context）")


if __name__ == "__main__":
    main()
