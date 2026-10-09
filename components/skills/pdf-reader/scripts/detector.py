"""
PDF 类型检测模块 — 判断 PDF 是文本型还是图片型（需 OCR 兜底）。

检测策略：用 pdfplumber 采样前 N 页，计算平均字符数，与阈值比较。

为什么用 pdfplumber 而不是 markitdown 做检测？
  - pdfplumber 是 markitdown 的底层依赖之一，体量更轻
  - 检测只需要读前几页做字符统计，不需要完整的 markdown 转换
  - pdfplumber 的 extract_text() 直接返回纯文本，无格式化开销

阈值设计的经验依据：
  - 真正的文本型 PDF 每页通常有几百到上千字符
  - 纯图片型 PDF 通过 pdfplumber 能提取 0~10 字符（如页眉页脚的 OCR 噪声）
  - TEXT_THRESHOLD = 50 在两者之间留足安全边际，避免误判

容错设计：
  - pdfplumber 未安装 → 返回 "image"（走 OCR 保证内容不丢失）
  - PDF 打开失败 / 解析异常 → 返回 "image"（宁可多 OCR 也不错失内容）
"""

from pathlib import Path

# 采样前 3 页做判断，既保证准确性又避免大文件检测过慢
SAMPLE_PAGES = 3

# 平均每页字符数阈值：>= 50 → 文本型，< 50 → 图片型
# 50 的取值足够区分"有内容的文本页"和"OCR 残留的几个字符"
TEXT_THRESHOLD = 50


def detect(pdf_path: Path) -> str:
    """检测 PDF 类型，返回 'text' 或 'image'。

    检测算法：
      1. 尝试导入 pdfplumber（按需导入，避免文本型 PDF 也要装依赖）
      2. 打开 PDF，取前 min(SAMPLE_PAGES, total_pages) 页采样
      3. 对每页调用 extract_text()，累计非空白字符数
      4. 计算平均每页字符数，与 TEXT_THRESHOLD 比较
      5. 任何异常情况都返回 'image'（安全兜底策略）

    Args:
        pdf_path: PDF 文件的绝对路径。

    Returns:
        'text'  — 文本型 PDF，可使用 markitdown 提取
        'image' — 图片型 PDF，需要走 OCR 流程
    """
    try:
        import pdfplumber
    except ImportError:
        # pdfplumber 是 cli.py 的声明依赖（PEP 723 inline script metadata），
        # 正常情况不会进入此分支，保留作为防御性编程
        return "image"

    try:
        with pdfplumber.open(str(pdf_path)) as pdf:
            total_pages = len(pdf.pages)
            # 取实际页数和 SAMPLE_PAGES 的较小值，避免短 PDF 越界
            sample_count = min(SAMPLE_PAGES, total_pages)

            if sample_count == 0:
                # 空 PDF（0 页），极少见但需处理
                return "image"

            total_chars = 0
            for i in range(sample_count):
                text = pdf.pages[i].extract_text()
                if text:
                    # strip() 去除首尾空白后再计长，避免纯空白页干扰统计
                    total_chars += len(text.strip())

            avg = total_chars / sample_count
            return "text" if avg >= TEXT_THRESHOLD else "image"

    except Exception:
        # 可能的异常：PDF 损坏、加密、pdfplumber 版本不兼容等
        # 统一降级到 OCR 路径，宁可多花时间也不丢失内容
        return "image"
