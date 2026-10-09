"""
输入扫描模块 — 将用户指定的文件或目录路径展开为 PDF 文件列表。

本模块是 PDF 转换管线的入口第一步：接收用户输入的路径字符串，
验证其合法性，然后收集所有符合条件的 .pdf 文件，以排序列表形式返回。

支持三种输入形式：
  1. 单个 .pdf 文件 → 返回单元素列表
  2. 目录（非递归）→ 返回目录下所有 .pdf 文件（仅一级）
  3. 目录（递归）  → 返回目录树中所有 .pdf 文件，按路径排序

设计要点：
  - expanduser() 支持 ~ 路径
  - resolve() 将相对路径转为绝对路径，便于后续模块使用
  - 始终对结果排序，保证多次运行顺序一致
  - 找不到 PDF 时抛出 FileNotFoundError（语义精确，cli.py 统一捕获）
"""

from pathlib import Path


def collect(path: str, recursive: bool = False) -> list[Path]:
    """扫描输入路径，收集所有 PDF 文件并返回排序后的 Path 列表。

    处理逻辑（按优先级依次尝试）：
      1. 输入路径不存在 → 抛出 FileNotFoundError
      2. 输入为文件 → 检查后缀是否为 .pdf，是则返回 [path]
      3. 输入为目录 → 根据 recursive 参数选择 glob 模式收集 PDF
      4. 输入为其他类型（符号链接损坏、设备文件等）→ 抛出 ValueError

    Args:
        path: 用户输入的路径字符串，支持相对路径、绝对路径、~ 简写。
        recursive: 是否递归扫描子目录。默认 False 仅扫描一级。

    Returns:
        按字符串顺序排序的 Path 对象列表，保证每次运行顺序一致。

    Raises:
        FileNotFoundError: 路径不存在，或目录下没有找到任何 PDF 文件。
        ValueError: 路径存在但不是 PDF 文件也不是目录（如设备文件）。
    """
    # 预处理：展开用户目录，相对路径转换为绝对路径
    p = Path(path).expanduser().resolve()

    # 情况 1：路径不存在（可能是用户拼写错误）
    if not p.exists():
        raise FileNotFoundError(f"路径不存在: {p}")

    # 情况 2：路径是单个文件
    if p.is_file():
        # 大小写不敏感比较后缀（.PDF、.Pdf 都能识别）
        if p.suffix.lower() != ".pdf":
            raise ValueError(f"不是 PDF 文件: {p}")
        return [p]

    # 情况 3：路径是目录
    if p.is_dir():
        # recursive 控制 glob 模式：
        #   False → "*.pdf" 只匹配当前目录下的 PDF
        #   True  → "**/*.pdf" 递归匹配所有子孙目录中的 PDF
        pattern = "**/*.pdf" if recursive else "*.pdf"
        pdfs = sorted(p.glob(pattern))
        if not pdfs:
            raise FileNotFoundError(f"目录下没有找到 PDF 文件: {p}")
        return pdfs

    # 情况 4：既非文件也非目录（极少见，如损坏的符号链接）
    raise ValueError(f"无法识别的路径类型: {p}")
