"""
输出管理模块 — 负责将 PDF 转换结果写入结构化的文件树。

产出目录结构（以 pdf-output/ 为例）：
  pdf-output/
  ├── Index.md              ← 全局索引，每处理完一个 PDF 追加一行
  └── <pdf-name>/           ← 每个 PDF 一个子目录
      ├── 00-full.md        ← 原始提取/OCR 的 markdown 文本
      ├── 01-summary.md     ← Claude 生成的带 frontmatter 的结构化摘要（占位模板）
      ├── 02-meta.json      ← 转换元数据（方式、页数、字符数、耗时等）
      └── 03-ocr/           ← OCR 中间产物目录（仅图片型 PDF）

编号前缀规则（00/01/02/03）确保文件在文件管理器中按逻辑顺序排列：
  00 → 原文
  01 → 摘要（Claude 负责填写内容，脚本只写占位模板）
  02 → 元数据
  03 → OCR 产物

Writer 类维护内部计数器，跟踪文本型和 OCR 型 PDF 的数量，
供 final summary 汇报使用。
"""

from __future__ import annotations

import json
from pathlib import Path
from datetime import datetime, timezone


class Writer:
    """管理输出目录结构，写入转换结果文件。

    生命周期：
      1. 构造 → 初始化计数器、记录 Index.md 路径
      2. init_index() → 写入 Index.md 表头（含处理时间戳）
      3. write_result() → 每个 PDF 调用一次，创建子目录并写入所有文件
      4. summary() → 返回最终统计字符串，供 cli.py 打印

    内部状态：
      - _counter: 已处理 PDF 总数
      - _text_count: 文本型 PDF 数量
      - _ocr_count: OCR 型（图片型）PDF 数量
    """

    def __init__(self, output_dir: Path):
        """初始化 Writer。

        Args:
            output_dir: 输出根目录的绝对路径，不存在则自动创建。
        """
        self.output_dir = output_dir
        # mkdir(parents=True) 确保嵌套路径也能创建
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self._index_path = self.output_dir / "Index.md"
        self._counter = 0
        self._text_count = 0
        self._ocr_count = 0

    # ------------------------------------------------------------------
    # Index.md 管理
    # ------------------------------------------------------------------

    def init_index(self) -> None:
        """写入 Index.md 的表头行。

        在开始处理任何 PDF 之前调用一次。表头包含处理时间戳和列名。
        后续每处理完一个 PDF 通过 _append_index() 追加数据行。
        """
        # 使用本地时区的 ISO 时间戳
        timestamp = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M")
        lines = [
            "# PDF 转换索引\n",
            f"> 处理时间: {timestamp}\n",
            "| # | 文档 | 方式 | 页数 | 字符数 | 耗时 |",
            "|---|------|------|------|--------|------|",
        ]
        # 初始写入表头（模式为 write，后续都是 append）
        self._index_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    def _append_index(
        self,
        name: str,
        method: str,
        pages: int,
        chars: int,
        duration: str,
    ) -> None:
        """向 Index.md 追加一行转换记录。

        每行是一条管道符分隔的表格行，记录单次转换的关键指标，
        便于快速浏览批量处理结果。

        Args:
            name: PDF 文件名（不含 .pdf 后缀）。
            method: 转换方式，'text' 或 'image'。
            pages: 页数。
            chars: 提取的总字符数。
            duration: 已格式化的耗时字符串，如 "2.5s"。
        """
        self._counter += 1
        # chars 使用千位分隔符 → 如 "12,340"
        row = f"| {self._counter} | {name} | {method} | {pages} | {chars:,} | {duration} |"
        with open(self._index_path, "a", encoding="utf-8") as f:
            f.write(row + "\n")

    # ------------------------------------------------------------------
    # 主写入方法
    # ------------------------------------------------------------------

    def write_result(
        self,
        pdf_name: str,
        pdf_path: str,
        markdown: str,
        method: str,
        pages: int,
        per_page_chars: list[int],
        duration_ms: int,
        ocr_artifact_dir: Path | None = None,
    ) -> Path:
        """为一个 PDF 创建完整的输出子目录并写入所有文件。

        写入的文件（按编号前缀顺序）：
          1. 00-full.md    — 原始 markdown 内容
          2. 01-summary.md — frontmatter 占位模板（Claude 后续填充）
          3. 02-meta.json  — 转换元数据
          4. 03-ocr/       — 若有 OCR 中间产物，从临时目录移过来

        Args:
            pdf_name: PDF 文件名（不含 .pdf 后缀），用作子目录名。
            pdf_path: PDF 源文件的原始路径，记录到 meta.json。
            markdown: 提取/OCR 得到的完整 markdown 文本。
            method: 转换方式，'text' 或 'image'。
            pages: PDF 总页数。
            per_page_chars: 每页字符数列表（OCR 型），或空列表（文本型）。
            duration_ms: 转换耗时（毫秒）。
            ocr_artifact_dir: OCR PNG 产物临时目录路径，None 表示非 OCR。

        Returns:
            创建的 PDF 子目录 Path 对象。
        """
        # 创建子目录：pdf-output/<pdf-name>/
        subdir = self.output_dir / pdf_name
        subdir.mkdir(parents=True, exist_ok=True)

        # ----- 00-full.md -----
        (subdir / "00-full.md").write_text(markdown, encoding="utf-8")

        # ----- 02-meta.json -----
        # 总字符数：有分页数据则累加，否则用 markdown 总长度
        total_chars = sum(per_page_chars) if per_page_chars else len(markdown)
        meta = {
            "source": pdf_name + ".pdf",
            "source_path": pdf_path,
            "method": method,
            "pages": pages,
            "extracted_chars": total_chars,
            "duration_ms": duration_ms,
            "converted_at": datetime.now(timezone.utc)
            .astimezone()
            .isoformat(),
        }
        # 图片型 PDF 额外记录 OCR 相关信息
        if method == "image" and per_page_chars:
            meta["ocr"] = {
                "dpi": 150,
                "languages": ["chi_sim", "eng"],
                "per_page_chars": per_page_chars,
            }
        (subdir / "02-meta.json").write_text(
            json.dumps(meta, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        # ----- 03-ocr/ 中间产物迁移 -----
        # OCR 的 PNG 文件最初在 temp_base/pdf_name/ 下（避开沙箱限制），
        # 现在移到最终输出目录的 03-ocr/ 子文件夹
        if ocr_artifact_dir and ocr_artifact_dir.exists():
            final_ocr = subdir / "03-ocr"
            # 如果目标已存在（极少见），先删除旧的
            if final_ocr.exists():
                import shutil
                shutil.rmtree(final_ocr)
            # rename 是原子操作（同文件系统内），比 shutil.move 更高效
            ocr_artifact_dir.rename(final_ocr)

        # ----- 01-summary.md 占位模板 -----
        # 脚本不负责生成实际内容，只写入带 YAML frontmatter 的空模板。
        # Claude 在 Step 3 中读取 00-full.md 后填充此文件。
        # 注意：占位值不加引号，因为任何字段值都不包含 YAML 特殊字符。
        placeholder = (
            "---\n"
            "title:\n"
            "tldr:\n"
            "description:\n"
            "keyPoints:\n"
            "  -\n"
            "  -\n"
            "  -\n"
            "  -\n"
            "  -\n"
            "---\n\n"
            "# 文档标题 — 详细解读\n\n"
            "## 文档概要\n\n"
            "## 核心内容\n\n"
            "## 关键洞察\n\n"
            "## 结构大纲\n"
        )
        (subdir / "01-summary.md").write_text(placeholder, encoding="utf-8")

        # ----- 更新 Index.md 索引行 -----
        from utils import fmt_duration

        self._append_index(
            pdf_name,
            method,
            pages,
            total_chars,
            fmt_duration(duration_ms),
        )

        # 更新内部计数器（供 summary 统计使用）
        if method == "image":
            self._ocr_count += 1
        else:
            self._text_count += 1

        return subdir

    # ------------------------------------------------------------------
    # 汇总
    # ------------------------------------------------------------------

    def summary(self) -> str:
        """返回最终统计信息，在全部 PDF 处理完毕后调用。

        Returns:
            格式为 "完成 N 个 PDF, 文本型 X, OCR 型 Y" 的字符串。
        """
        return (
            f"完成 {self._counter} 个 PDF, "
            f"文本型 {self._text_count}, "
            f"OCR 型 {self._ocr_count}"
        )
