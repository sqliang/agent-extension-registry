# github-source-decoder

一个在 Claude Code 中全自动运行的代码仓库分析工具：

- 一键分析 GitHub 或本地仓库
- 自动生成中文分析报告
- 智能添加中文代码注释
- 全程无需中间交互

## 📁 目录结构

```
github-source-decoder/
├── SKILL.md                          # Skill 定义
├── README.md                         # 本文件
├── scripts/
│   ├── github-source-decoder.sh      # 仓库准备脚本
│   ├── analyze_repo.py              # 分析脚本（输出结构化 JSON）
│   └── scanner.py                   # 代码扫描器
├── references/
│   └── comment-guide.md             # 中文注释添加指南
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-04-11-repo-insight-2.0-design.md
```

## 🚀 快速开始

### 作为 Skill 在 Claude Code 中使用

```
用户：帮我分析这个仓库：https://github.com/username/repo.git

[全自动执行中...]

Claude：分析完成！报告在 ~/github-sources/repo/reports/ 目录
```

### 直接使用脚本（测试）

```bash
# 准备仓库并输出结构化 JSON
scripts/github-source-decoder.sh https://github.com/username/repo.git

# 分析当前目录
cd /path/to/repo
/path/to/github-source-decoder/scripts/github-source-decoder.sh
```

## 📋 分析流程

github-source-decoder 2.0 采用混合架构：

1. **脚本层** - 仓库克隆、文件扫描、结构化数据输出
2. **Claude 工具调用** - 读取数据、理解代码、生成内容、写入文件

### 完整工作流

```
用户调用
    │
    ▼
[脚本层] 仓库准备
    ├─ 确认仓库位置（URL clone 或当前目录）
    ├─ 运行基础扫描
    └─ 输出结构化 JSON
    │
    ▼
[Claude] 智能分析（通过工具调用）
    ├─ 读取脚本输出
    ├─ 制定分析计划
    ├─ 深度分析代码
    ├─ 生成报告和注释
    └─ 写入文件到磁盘
    │
    ▼
完成！输出结果位置
```

## 📊 分析报告内容

生成的报告包含：

1. **项目概述** - 用途、技术栈、主要功能
2. **架构分析** - 目录结构、模块关系、设计模式
3. **核心模块** - 关键文件和功能详解
4. **依赖关系** - 主要依赖库及其用途
5. **使用指南** - 安装、配置、运行
6. **扩展建议** - 可能的改进方向

## 📝 注释规范

详细的注释指南请参考 [references/comment-guide.md](references/comment-guide.md)。

### 核心原则

- 解释"为什么"而不只是"是什么"
- 为复杂算法、设计模式、关键业务逻辑添加注释
- 使用清晰的中文表达
- 保持注释与代码同步更新

## 🔧 脚本说明

### github-source-decoder.sh

仓库准备脚本，支持两种模式：

```bash
# URL 模式
scripts/github-source-decoder.sh <GitHub仓库URL> [分支名]

# 当前目录模式
scripts/github-source-decoder.sh
```

输出：结构化 JSON 数据到 stdout

### analyze_repo.py

分析脚本，生成报告模板或输出结构化 JSON：

```bash
# 生成报告模板
python3 scripts/analyze_repo.py <仓库路径>

# 输出结构化 JSON
python3 scripts/analyze_repo.py <仓库路径> --json <输出文件>
```

### scanner.py

代码扫描器，文件分类和复杂度分析：

```bash
python3 scripts/scanner.py <仓库路径>
```

## 📄 许可证

MIT License
