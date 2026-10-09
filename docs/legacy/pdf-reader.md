# PDF Reader Skill

自动将 PDF 文件转为结构化 Markdown — 文本型 PDF 通过 [Microsoft markitdown](https://github.com/microsoft/markitdown) 提取，图片/扫描型 PDF 通过 tesseract OCR 兜底。配合 Claude 自动生成带 YAML frontmatter 的结构化总结。

## 概述

### 适用场景

- 演讲 Slide 整理（图片型 PDF 占比高）
- 论文 / 报告 / 合同的内容提取
- 批量文档处理与索引
- 任何 "这个 PDF 里说了什么" 的场景

### 能力矩阵

| 场景 | 提取方式 | 效果 |
|------|---------|------|
| 文字型 PDF | markitdown | 保留表格、格式，速度快 |
| 图片型 PDF | pdftoppm → tesseract (chi_sim+eng) | 中文 OCR，150 DPI |
| 混合型 | 自动检测切换 | 从文字密度判断 |

## 快速开始

### 1. 安装依赖

```bash
# 文本提取
uv tool install "markitdown[pdf]"

# OCR 兜底
brew install poppler tesseract tesseract-lang
```

验证：

```bash
markitdown --help
tesseract --list-langs | grep chi_sim   # 应输出 chi_sim
pdftoppm -v
```

### 2. 使用

```bash
cd <skill 目录>

# 单个文件
uv run scripts/cli.py "document.pdf" -o ./pdf-output/

# 整个目录（批量处理）
uv run scripts/cli.py "./pdfs/" -o ./pdf-output/

# 指定 OCR 临时目录（避免 /tmp 沙箱限制）
uv run scripts/cli.py "doc.pdf" -o ./out/ --tmp ~/Downloads/.pdf-tmp/
```

## 工作流程

```
输入 PDF (单个 / 目录)
    │
    ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ scanner  │ → │ detector  │ → │ extractor│ → │  writer  │
│ 收集文件 │    │ 文字/图片 │    │ 提取文本 │    │ 产出文件 │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                     │
                              ┌──────┴──────┐
                            text          image
                              │              │
                         markitdown    pdftoppm +
                                       tesseract

                  ┌───────────────────────┐
                  │ Claude 读取 full.md    │
                  │ 生成结构化 summary.md   │  ← 全自动，无需干预
                  └───────────────────────┘
```

全程自动：脚本负责 PDF → Markdown 转换，Claude 负责结构化总结，一气呵成。

## 输出结构

```
pdf-output/
├── Index.md                          # 全局索引表（脚本产出）
└── <pdf-name>/
    ├── 00-full.md                    # 原始 Markdown 转换（脚本产出）
    ├── 01-summary.md                 # 结构化要点总结（Claude 产出）
    ├── 02-meta.json                  # 转换元数据（脚本产出）
    └── 03-ocr/                       # OCR 中间产物（仅图片型 PDF）
        └── page-NN.png
```

### 各文件说明

| 文件 | 产出方 | 说明 |
|------|--------|------|
| `Index.md` | 脚本 | 所有 PDF 的转换摘要表，含方式、页数、字符数、耗时 |
| `00-full.md` | 脚本 | 完整的原始文本转换结果 |
| `01-summary.md` | Claude | YAML frontmatter + Markdown 正文的结构化总结 |
| `02-meta.json` | 脚本 | JSON 格式的转换元数据（方法、页数、DPI 等） |
| `03-ocr/` | 脚本 | OCR 的 PNG 中间文件，可人工检查识别质量 |

## 01-summary.md 格式说明

每个 PDF 的 `01-summary.md` 包含 **YAML frontmatter** + **Markdown 正文** 两部分。

### Frontmatter 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 文档标题，提取或推断 |
| `tldr` | string | 一句话核心总结，50 字以内 |
| `description` | string | 2-3 句描述，概括文档目的和主要内容 |
| `keyPoints` | list | 5 条核心要点，每条一句，具体可执行 |

### 正文结构

| 章节 | 说明 |
|------|------|
| `## 文档概要` | 背景、目的、作者/来源信息 |
| `## 核心内容` | 按原文结构分段解读，提炼串联而非简单复述 |
| `## 关键洞察` | 超越原文：什么值得重视？什么有争议？什么可落地？ |
| `## 结构大纲` | 文档的章节逻辑树 |

## CLI 参考

```
uv run scripts/cli.py INPUT [-o OUTPUT] [--tmp TMP_DIR]

参数:
  INPUT          PDF 文件路径，或包含 PDF 的目录路径（必需）
  -o, --output   输出目录（默认: ./pdf-output/）
  --tmp          OCR 临时目录（默认: ~/Downloads/.pdf-ocr-tmp/）
```

## 常见问题

**Q: OCR 质量不佳怎么办？**
A: 1) 检查 `03-ocr/` 下的 PNG 原图清晰度；2) 尝试提高 DPI（修改 `ocr_engine.py` 中 `OCR_DPI` 变量，默认 150）；3) 确认 `tesseract --list-langs` 包含 `chi_sim`。

**Q: 如何添加更多语言支持？**
A: `brew install tesseract-lang` 安装全部语言包，然后在 `ocr_engine.py` 中修改 `OCR_LANGS` 变量。例如加日语：`"chi_sim+eng+jpn"`。

**Q: 为什么 /tmp 不可用？**
A: macOS 沙箱限制，Claude Code 的子进程无法访问 `/tmp`。默认临时目录为 `~/Downloads/.pdf-ocr-tmp/`，可用 `--tmp` 参数自定义。

**Q: 如何处理超大 PDF？**
A: `detector.py` 默认只采样前 3 页检测类型。对于超大 PDF 的 OCR，会逐页处理自动保留中间产物，可随时中断并从断点继续。

## 技术架构

```
pdf-reader/
├── SKILL.md              # Claude skill 指令（4-Step 流水线）
├── README.md             # 本文档
└── scripts/
    ├── cli.py            # CLI 入口，编排主流程
    ├── scanner.py        # 输入扫描，收集 PDF 文件
    ├── detector.py       # 类型检测，采样 pdfplumber 判断文字密度
    ├── extractor.py      # 提取器调度，路由到 markitdown 或 OCR
    ├── ocr_engine.py     # OCR 引擎，pdftoppm + tesseract
    ├── writer.py         # 输出管理，建目录/写文件/维护索引
    └── utils.py          # 共享工具函数
```

### 扩展指南

**添加新的提取器**：在 `extractor.py` 中增加新的分支，例如调用 Google Vision API 或 paddleOCR。

**添加新的文本引擎**：在 `extractor.py` 的 `_extract_text` 中替换或增加 markitdown 之外的工具。

**复用模块**：`scanner.py` 和 `ocr_engine.py` 设计为独立模块，可被其他 skill 直接引用。
