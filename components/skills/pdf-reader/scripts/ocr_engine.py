"""
OCR 引擎模块 — 将图片型（扫描件/幻灯片导出）PDF 转为 markdown 文本。

完整 OCR 管线（三步流水线）：
  1. pdftoppm  → 将 PDF 每页渲染为 150 DPI 的 PNG 图片
  2. tesseract → 逐页调用 OCR 引擎，识别中文(chi_sim)和英文(eng)
  3. 格式化    → 拼接页分隔符、添加统计头信息，输出 markdown

对外接口：
  - check_dependencies() → 返回缺失依赖列表，供调用方做前置检查
  - extract()           → 执行完整 OCR 流程，返回 markdown + 每页字符数

依赖要求：
  - poppler    (brew install poppler)     → 提供 pdftoppm
  - tesseract  (brew install tesseract)   → OCR 引擎本体
  - tesseract-lang (brew install tesseract-lang) → 中文语言包 chi_sim

DPI 选择依据 (150 DPI)：
  - 150 DPI 在识别准确率和速度/体积间取平衡
  - 演讲幻灯片字体较大，150 DPI 足够 tesseract 准确识别
  - 若遇到极小字体，可提高至 300，但处理时间会成倍增长
"""

import subprocess
import sys
from pathlib import Path

from utils import log, count_chars_per_page

# pdftoppm 渲染分辨率 (dots per inch)
# 150 是 PPT/文档 OCR 的甜点：文字清晰 + 文件体积可控
OCR_DPI = 150

# tesseract 语言参数：中文简体 + 英文
# 顺序 chi_sim+eng 表示优先中文识别，英文作为辅助
OCR_LANGS = "chi_sim+eng"


# ---------------------------------------------------------------------------
# 依赖检查
# ---------------------------------------------------------------------------

def check_dependencies() -> list[str]:
    """检查 OCR 所需的外部命令行工具和语言包是否安装。

    检查项（按调用顺序）：
      1. pdftoppm — poppler 包提供的 PDF 转图片工具
      2. tesseract — OCR 引擎本体
      3. chi_sim 语言数据 — 中文简体识别能力（通过 tesseract --list-langs 验证）

    Returns:
        缺失依赖的描述字符串列表。空列表表示所有依赖就绪。
        每个字符串可直接展示给用户，包含安装命令提示。
    """
    import shutil

    missing = []

    # 检查 1: pdftoppm（poppler 包）
    if not shutil.which("pdftoppm"):
        missing.append("poppler (brew install poppler)")

    # 检查 2: tesseract 本体
    if not shutil.which("tesseract"):
        missing.append("tesseract (brew install tesseract)")
    else:
        # 检查 3: 中文语言包（只有 tesseract 已安装时才能执行 --list-langs）
        # tesseract --list-langs 输出格式：每行一个语言代码
        result = subprocess.run(
            ["tesseract", "--list-langs"],
            capture_output=True,
            text=True,
        )
        if "chi_sim" not in result.stdout:
            missing.append("tesseract-lang (brew install tesseract-lang)")

    return missing


# ---------------------------------------------------------------------------
# OCR 主流程
# ---------------------------------------------------------------------------

def extract(pdf_path: Path, artifact_dir: Path) -> tuple[str, list[int]]:
    """对图片型 PDF 执行完整 OCR 流程。

    执行步骤：
      1. 依赖检查 → 不满足则打印安装提示并退出
      2. pdftoppm -png -r 150 → 将每页渲染为 PNG，存入 artifact_dir
      3. 按文件名排序收集 PNG 文件（保证页码顺序）
      4. 逐页调用 tesseract -l chi_sim+eng stdout → 提取文本
      5. 调用 _format_output 拼接最终 markdown

    **为什么保留 PNG 中间产物？**
      - 用户可手动抽查 OCR 质量（对比原图和识别结果）
      - 调试时可直接查看是哪一页的识别效果差

    Args:
        pdf_path: PDF 文件的绝对路径。
        artifact_dir: 存放 PNG 中间产物的目录（由 writer 最终移至 03-ocr/）。

    Returns:
        (markdown_text, per_page_char_counts) 二元组：
        - markdown_text: 带页分隔符和统计头的 markdown 文本
        - per_page_char_counts: 每页字符数列表，记录到 meta.json 的 ocr 字段
    """
    # Step 1: 依赖检查
    missing = check_dependencies()
    if missing:
        msg = (
            "OCR 依赖缺失, 请先安装:\n"
            + "\n".join(f"  - {m}" for m in missing)
            + "\n\n安装后重新运行即可。"
        )
        log(msg, "ERROR")
        sys.exit(1)

    # Step 2: 确保 artifact_dir 存在
    artifact_dir.mkdir(parents=True, exist_ok=True)

    # pdftoppm 的输出前缀：page-01.png, page-02.png, ...
    prefix = artifact_dir / "page"

    # Step 3: pdftoppm — PDF → 逐页 PNG
    #   -png    输出 PNG 格式
    #   -r 150  分辨率 150 DPI
    #   最后一个参数为输出前缀，pdftoppm 会自动加 -01.png, -02.png 后缀
    log(f"pdftoppm: {pdf_path} → {prefix}-*.png (DPI={OCR_DPI})")
    result = subprocess.run(
        [
            "pdftoppm",
            "-png",
            "-r",
            str(OCR_DPI),
            str(pdf_path),
            str(prefix),
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        log(f"pdftoppm 失败: {result.stderr}", "ERROR")
        sys.exit(1)

    # Step 4: 收集生成的 PNG 文件（按名称排序保证页码顺序）
    png_files = sorted(artifact_dir.glob("page-*.png"))
    total_pages = len(png_files)
    log(f"转换完成, 共 {total_pages} 页, 开始 OCR...")

    # Step 5: 逐页 OCR
    pages_text: list[str] = []
    for i, png in enumerate(png_files, 1):
        # tesseract <input> stdout -l <langs>
        #   <input>   → 输入图片路径
        #   stdout    → 将识别结果直接输出到 stdout（而非写入 txt 文件）
        #   -l langs  → 指定识别语言
        proc = subprocess.run(
            ["tesseract", str(png), "stdout", "-l", OCR_LANGS],
            capture_output=True,
            text=True,
        )
        if proc.returncode == 0:
            text = proc.stdout.strip()
        else:
            # 单页 OCR 失败不应中断整个流程，保留占位信息继续处理下一页
            text = f"[OCR 失败: 第 {i} 页]"
        pages_text.append(text)
        log(f"  [{i}/{total_pages}] {len(text)} chars")

    # Step 6: 统计每页字符数，拼接最终输出
    per_page_chars = count_chars_per_page(pages_text)
    markdown = _format_output(pages_text, per_page_chars)

    return markdown, per_page_chars


# ---------------------------------------------------------------------------
# 输出格式化
# ---------------------------------------------------------------------------

def _format_output(pages_text: list[str], per_page_chars: list[int]) -> str:
    """将逐页 OCR 结果拼接为带统计头和页分隔符的 markdown。

    输出结构：
      # OCR 转换结果
      > 页数: N
      > 语言: chi_sim+eng
      > DPI: 150

      --- PAGE 1 (245 chars) ---
      <text>
      --- PAGE 2 (312 chars) ---
      <text>
      ...

    Args:
        pages_text: 每页 OCR 识别出的文本列表。
        per_page_chars: 每页字符数（非空白），长度与 pages_text 相同。

    Returns:
        格式化的 markdown 字符串。
    """
    # 文件头：记录转换参数，便于后续查阅
    lines = [
        f"# OCR 转换结果\n",
        f"> 页数: {len(pages_text)}",
        f"> 语言: {OCR_LANGS}",
        f"> DPI: {OCR_DPI}\n",
    ]

    # 逐页拼接：页分隔符 + 文本内容
    for i, (text, count) in enumerate(zip(pages_text, per_page_chars), 1):
        lines.append(f"\n--- PAGE {i} ({count} chars) ---\n")
        lines.append(text)

    return "\n".join(lines)
