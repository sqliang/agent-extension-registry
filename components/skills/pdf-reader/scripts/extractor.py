"""
提取调度模块 — 根据 PDF 类型将提取任务路由到正确的引擎。

本模块是提取层的"路由器"：
  - 文本型 PDF → 调用 Microsoft markitdown CLI（保留表格和格式）
  - 图片型 PDF → 调用 ocr_engine 模块（pdftoppm + tesseract）

设计决策：
  - markitdown 通过 subprocess 调用而非 Python API，因为 markitdown 是
    通过 `uv tool install` 安装的独立 CLI，子进程调用可以隔离其依赖环境
  - markitdown 可能通过两种方式安装：
    1. 全局 PATH 中 → 直接调用 markitdown
    2. 通过 uv tool install → fallback 到 `uv tool run markitdown`
  - 延迟导入 ocr_engine：文本型 PDF 不需要加载 OCR 依赖，减少启动开销
"""

from __future__ import annotations

import subprocess
import shutil
from pathlib import Path

from utils import log


def extract(
    pdf_path: Path,
    pdf_type: str,
    artifact_dir: Path | None = None,
) -> tuple[str, list[int]]:
    """根据 PDF 类型调度提取引擎，返回 markdown 文本和每页字符数。

    这是 extractor 模块唯一的公开函数，cli.py 通过此函数完成所有提取工作，
    无需关心底层是 markitdown 还是 OCR。

    Args:
        pdf_path: PDF 文件的绝对路径。
        pdf_type: detector 返回的类型，'text' 或 'image'。
        artifact_dir: OCR 中间产物（PNG）存放目录，文本型 PDF 忽略此参数。

    Returns:
        (markdown_text, per_page_char_counts) 二元组：
        - markdown_text: 提取/转换后的完整 markdown 字符串
        - per_page_char_counts: 每页字符数列表
          * 文本型 PDF → 空列表（markitdown 不提供分页信息）
          * 图片型 PDF → 与页数等长的列表，用于 meta.json 的 OCR 质量记录

    Raises:
        AssertionError: 图片型 PDF 但未提供 artifact_dir。
    """
    if pdf_type == "text":
        return _extract_text(pdf_path)
    else:
        # 延迟导入：文本型 PDF 不需要 ocr_engine，避免加载 tesseract 等重依赖
        from ocr_engine import extract as ocr_extract

        # artifact_dir 是 OCR 流程必需的（存放 pdftoppm 生成的 PNG）
        # 如果为空说明调用方逻辑有误
        assert artifact_dir is not None, "artifact_dir required for OCR"
        return ocr_extract(pdf_path, artifact_dir)


def _extract_text(pdf_path: Path) -> tuple[str, list[int]]:
    """使用 Microsoft markitdown CLI 提取文本型 PDF 的 markdown 内容。

    内部通过 subprocess 调用 markitdown 命令行工具，捕获其 stdout
    作为提取结果。markitdown 支持保留 PDF 中的表格、标题层级等结构。

    markitdown 的两种调用路径：
      1. 直接 PATH 调用 — markitdown 已安装在系统 PATH 中
      2. uv tool run 调用 — markitdown 通过 uv 安装，需借 uv 查找解释器

    Args:
        pdf_path: PDF 文件的绝对路径。

    Returns:
        (markdown_text, []) — 文本内容 + 空字符数列表。
        per_page_chars 返回空列表因为 markitdown 输出为连续 markdown，
        不保留分页边界信息。
    """
    # 检测 markitdown 是否在 PATH 中，决定使用哪种调用方式
    if not shutil.which("markitdown"):
        log("markitdown 未安装, 尝试使用 uv run...", "WARN")
        # `uv tool run` 会查找 uv 管理的工具环境并执行
        cmd = ["uv", "tool", "run", "markitdown", str(pdf_path)]
    else:
        cmd = ["markitdown", str(pdf_path)]

    log(f"运行: {' '.join(cmd)}")
    # capture_output=True 捕获 stdout/stderr，text=True 返回字符串而非 bytes
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        # markitdown 返回非 0 通常意味着 PDF 损坏或格式不兼容
        log(f"markitdown 失败: {result.stderr}", "ERROR")
        return f"[提取失败]\n\n{result.stderr}", []

    text = result.stdout.strip()

    # 边缘情况：markitdown 成功退出但输出为空（可能 PDF 实际上是图片型但被误判）
    if not text:
        log("markitdown 输出为空", "WARN")
        text = "[警告] markitdown 未提取到文字内容, PDF 可能为图片型"

    return text, []
