"""
共用工具模块 — 为 pdf-reader skill 的其他模块提供基础支撑函数。

本模块是整条 PDF 转换管线的最底层依赖，被 scanner、detector、extractor、
ocr_engine、writer、cli 等模块引用。设计原则：纯函数为主，无副作用（除 log 写 stderr）。

职责边界：
  - 沙箱兼容的临时目录管理（macOS 沙箱禁止子进程访问 /tmp）
  - 文本统计（字符数、平均字符数）
  - 人类友好的时间与耗时格式化
  - 命令行工具检测
  - 统一的时间戳日志（写 stderr，避免污染 markitdown 的 stdout 输出）
"""

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path
from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# 临时目录管理
# ---------------------------------------------------------------------------

def get_temp_dir(base: str | None = None) -> Path:
    """返回一个沙箱安全的临时目录路径，供 OCR 引擎存放 PNG 中间产物。

    **为什么不能用 /tmp？**
      macOS 上的 Claude Code 会对子进程启用沙箱隔离，/tmp 目录在沙箱外，
      pdftoppm 和 tesseract 无法写入。因此必须使用用户家目录下的路径。

    Args:
        base: 用户指定的临时目录路径。若为 None，使用默认值
              ~/Downloads/.pdf-ocr-temp/

    Returns:
        已确保存在的目录 Path 对象（含递归创建父目录）。
    """
    if base:
        # 用户显式指定了临时目录 → 展开 ~ 并解析为绝对路径
        tmp = Path(base).expanduser().resolve()
    else:
        # 默认：放在 Downloads 下，既满足沙箱要求又方便用户手动查看/清理
        tmp = Path.home() / "Downloads" / ".pdf-ocr-temp"
    # mkdir(parents=True) 保证即使 Downloads 也不存在（极边缘情况）也能创建
    # exist_ok=True 避免并发或重复运行时抛异常
    tmp.mkdir(parents=True, exist_ok=True)
    return tmp


# ---------------------------------------------------------------------------
# 文本统计
# ---------------------------------------------------------------------------

def count_chars_per_page(text_pages: list[str]) -> list[int]:
    """统计每页文本的字符数（去除首尾空白后）。

    用于检测模块的文本密度判断和 OCR 模块的质量评估。

    Args:
        text_pages: 每页的文本内容列表，顺序与 PDF 页码一致。

    Returns:
        与输入等长的整数列表，每个元素为对应页的字符数。
    """
    return [len(p.strip()) for p in text_pages]


def avg_chars_per_page(text_pages: list[str]) -> float:
    """计算所有页面的平均字符数。

    在 detector 中用于判断 PDF 是文本型还是图片型：
      阈值 TEXT_THRESHOLD = 50，平均 >= 50 判为 text，否则为 image。

    Args:
        text_pages: 每页的文本内容列表。

    Returns:
        平均字符数（浮点数）。空列表返回 0.0，避免 ZeroDivisionError。
    """
    counts = count_chars_per_page(text_pages)
    if not counts:
        return 0.0
    return sum(counts) / len(counts)


# ---------------------------------------------------------------------------
# 格式化
# ---------------------------------------------------------------------------

def fmt_duration(ms: int) -> str:
    """将毫秒数格式化为人类友好的耗时字符串。

    分段策略：
      - < 1s  → 以 ms 显示（便于对比快速操作）
      - < 1m  → 以秒显示，保留 1 位小数
      - >= 1m → 以分钟显示，保留 1 位小数（OCR 场景常见）

    Args:
        ms: 耗时毫秒数。

    Returns:
        格式化后的字符串，如 "320ms"、"2.5s"、"6.3m"。
    """
    if ms < 1000:
        return f"{ms}ms"
    elif ms < 60000:
        return f"{ms / 1000:.1f}s"
    else:
        return f"{ms / 60000:.1f}m"


def now_iso() -> str:
    """返回当前时间的 ISO 8601 格式字符串（本地时区）。

    用途：Index.md 时间戳、日志前缀、meta.json 的 converted_at 字段。

    Returns:
        如 "2026-05-12T15:30:00+08:00" 的 ISO 格式字符串。
    """
    return datetime.now(timezone.utc).astimezone().isoformat()


# ---------------------------------------------------------------------------
# 日志与工具检测
# ---------------------------------------------------------------------------

def log(msg: str, level: str = "INFO") -> None:
    """向 stderr 写入带时间戳和级别的日志行。

    **为什么输出到 stderr 而不是 stdout？**
      markitdown 的文本提取结果通过 stdout 传递，如果日志也写 stdout
      会污染提取内容。stderr 是标准的日志通道，不影响数据流。

    Args:
        msg: 日志消息内容。
        level: 日志级别标签，用于前缀显示（INFO/WARN/ERROR）。
    """
    print(f"[{level}] {now_iso()}  {msg}", file=sys.stderr)


def check_command(cmd: str) -> bool:
    """检查某个命令行工具是否在 PATH 中可用。

    封装 shutil.which()，语义更清晰。用于 detector 和 extractor 模块
    快速判断 markitdown/pdftoppm/tesseract 是否已安装。

    Args:
        cmd: 命令名，如 "markitdown"、"pdftoppm"。

    Returns:
        True 表示命令存在于 PATH 中。
    """
    return shutil.which(cmd) is not None
