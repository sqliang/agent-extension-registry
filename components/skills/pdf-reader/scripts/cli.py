#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "pdfplumber",
# ]
# ///
"""
PDF Reader CLI — 命令行入口，编排 PDF 转 markdown 的完整管线。

本模块是 pdf-reader skill 的主入口，负责：
  1. 解析命令行参数（输入路径、输出目录、临时目录）
  2. 按顺序调用各管线模块：scanner → detector → extractor → writer
  3. 打印进度信息和最终操作指引

管线流程（每个 PDF 依次经过）：
  scanner.collect()  → 收集 PDF 文件列表
  detector.detect()  → 判断文本型/图片型
  extractor.extract() → 用 markitdown 或 OCR 提取内容
  writer.write_result() → 写入结构化输出文件

Python 版本与依赖管理：
  PEP 723 inline script metadata (/// script 块) 声明了依赖，
  用户通过 `uv run scripts/cli.py` 运行时，uv 会自动创建临时 venv
  并安装 pdfplumber，无需手动 pip install。

使用示例：
  # 单文件转换
  uv run scripts/cli.py input.pdf -o ./pdf-output/

  # 目录批量转换
  uv run scripts/cli.py ./pdfs/ -o ./pdf-output/

  # 指定 OCR 临时目录（避免沙箱 /tmp 限制）
  uv run scripts/cli.py input.pdf --tmp ~/Downloads/.pdf-tmp/
"""

import argparse
import sys
import time
from pathlib import Path

# 确保 scripts/ 目录在 Python 搜索路径中，
# 使得 `from scanner import collect` 等同级导入可以正常工作，
# 无论用户从哪个目录运行此脚本。
_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from scanner import collect
from detector import detect
from extractor import extract
from writer import Writer
from utils import log, get_temp_dir, now_iso


def main():
    """主函数：解析参数 → 收集 → 检测 → 提取 → 写入 → 汇报。"""

    # ---- 参数解析 ----
    parser = argparse.ArgumentParser(
        description="PDF Reader — 将 PDF 转为 Markdown (支持 OCR 兜底)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""示例:
  uv run scripts/cli.py input.pdf -o ./output/
  uv run scripts/cli.py ./pdfs/ -o ./output/
  uv run scripts/cli.py input.pdf -o ./output/ --tmp ~/Downloads/.pdf-tmp/
        """,
    )
    parser.add_argument(
        "input",
        help="PDF 文件路径, 或包含 PDF 的目录路径",
    )
    parser.add_argument(
        "-o",
        "--output",
        default="./pdf-output",
        help="输出目录 (默认: ./pdf-output/)",
    )
    parser.add_argument(
        "--tmp",
        default=None,
        help="OCR 临时目录 (默认: ~/Downloads/.pdf-ocr-temp/)。"
        "macOS 沙箱禁止访问 /tmp，请使用家目录下的路径。",
    )
    args = parser.parse_args()

    # ---- Step 1: 扫描收集 PDF 文件 ----
    try:
        pdfs = collect(args.input)
    except (FileNotFoundError, ValueError) as e:
        log(str(e), "ERROR")
        sys.exit(1)

    log(f"扫描到 {len(pdfs)} 个 PDF 文件")

    # ---- Step 2: 初始化输出目录和 Writer ----
    # expanduser() 支持 ~ 路径，resolve() 转为绝对路径
    output_dir = Path(args.output).expanduser().resolve()
    writer = Writer(output_dir)
    # 写入 Index.md 表头（只写一次，后续追加数据行）
    writer.init_index()

    # 获取沙箱安全的临时目录（pdftoppm/tesseract 的 PNG 产物暂存处）
    temp_base = get_temp_dir(args.tmp)

    # ---- Step 3: 逐个处理 PDF ----
    for idx, pdf_path in enumerate(pdfs, 1):
        # pdf_path.stem = 不包含 .pdf 后缀的文件名
        pdf_name = pdf_path.stem
        log(f"[{idx}/{len(pdfs)}] {pdf_name} — 开始处理")

        # 记录处理开始时间（monotonic 不受系统时钟调整影响）
        t_start = time.monotonic()

        # 3a. 类型检测：文本型走 markitdown，图片型走 OCR
        pdf_type = detect(pdf_path)
        log(f"  检测结果: {pdf_type}")

        # 3b. 内容提取：图片型需提供 artifact_dir 存放 PNG 产物
        artifact_dir = None
        if pdf_type == "image":
            # 每个 PDF 的 OCR 产物单独存放，避免同名冲突
            artifact_dir = temp_base / pdf_name

        markdown, per_page_chars = extract(pdf_path, pdf_type, artifact_dir)

        # 计算耗时
        duration_ms = int((time.monotonic() - t_start) * 1000)

        # 获取页数：OCR 有分页数据，文本型用 pdfplumber 单独统计
        pages = (
            len(per_page_chars) if per_page_chars else _count_pages(pdf_path)
        )

        # 3c. 写入输出文件（00-full.md, 01-summary.md, 02-meta.json, 03-ocr/）
        subdir = writer.write_result(
            pdf_name=pdf_name,
            pdf_path=str(pdf_path),
            markdown=markdown,
            method=pdf_type,
            pages=pages,
            per_page_chars=per_page_chars,
            duration_ms=duration_ms,
            ocr_artifact_dir=artifact_dir if pdf_type == "image" else None,
        )

        from utils import fmt_duration

        log(f"  完成 → {subdir}/ ({fmt_duration(duration_ms)})")

    # ---- Step 4: 打印结果汇总和操作指引 ----
    log(writer.summary())
    print(f"\n输出目录: {output_dir}/")
    print("=" * 60)
    print("[ACTION REQUIRED] 立即执行以下步骤:")
    print(f"  1. 读取 {output_dir}/ 下每个子目录的 00-full.md")
    print(f"  2. 为每个 PDF 生成 01-summary.md, 包含 YAML frontmatter")
    print(f"    必填字段: title, tldr, description, keyPoints (5条)")
    print(f"  3. 正文: 文档概要 / 核心内容 / 关键洞察 / 结构大纲")
    print("=" * 60)


# ------------------------------------------------------------------
# 辅助函数
# ------------------------------------------------------------------

def _count_pages(pdf_path: Path) -> int:
    """尝试通过 pdfplumber 获取 PDF 页数，失败返回 0。

    主要用于文本型 PDF：markitdown 不提供分页信息，
    但 meta.json 仍需要记录页数。此函数提供尽力而为的页数统计。

    Args:
        pdf_path: PDF 文件路径。

    Returns:
        PDF 页数，若 pdfplumber 不可用或打开失败则返回 0。
    """
    try:
        import pdfplumber

        with pdfplumber.open(str(pdf_path)) as pdf:
            return len(pdf.pages)
    except Exception:
        # 无法获取页数时不阻塞流程，Index.md 和 meta.json 会显示 0
        return 0


if __name__ == "__main__":
    main()
