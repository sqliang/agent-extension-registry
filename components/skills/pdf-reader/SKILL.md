---
name: pdf-reader
description: Read, extract, convert, or summarize PDF files with OCR fallback for scanned documents. Use for single-file or batch PDF processing and structured Markdown output.
---

# PDF Reader

将文本型或扫描型 PDF 转为结构化 Markdown。脚本和资源必须从当前 Skill 根目录解析，输入与输出必须位于用户明确指定的项目路径。

## 1. 检查运行依赖

先运行 `agent-ext doctor --target <host>`，或分别检查 `python3`、`uv`、`markitdown`、`pdftoppm` 和 `tesseract`。缺失依赖时给出平台化安装建议，但不要自动安装系统软件。

## 2. 确定路径

- `<skill-root>`：包含本文件的目录。
- `<input>`：用户指定的 PDF 文件或目录的绝对路径。
- `<project-root>`：当前目标项目根目录，不通过 `.claude`、`.agents` 或 `.cursor` 等固定目录反推。
- `<output>`：默认 `<project-root>/pdf-output`，写入前确认不会覆盖用户文件。

## 3. 执行转换

```bash
uv run <skill-root>/scripts/cli.py "<input>" -o "<output>"
```

没有 `uv` 时，可在依赖已经满足的 Python 环境中直接运行：

```bash
python3 <skill-root>/scripts/cli.py "<input>" -o "<output>"
```

脚本会检测文本层，并在需要时使用 OCR。转换完成后检查 `Index.md` 和每份 PDF 的 Markdown 输出，再按用户需求总结。不要把真实 PDF、OCR 中间文件或知识库内容写回组件仓库。
