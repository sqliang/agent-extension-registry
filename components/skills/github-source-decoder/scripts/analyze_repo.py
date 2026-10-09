#!/usr/bin/env python3
"""
仓库分析脚本
自动化分析代码结构、生成报告框架、输出结构化 JSON
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from collections import defaultdict


class RepoAnalyzer:
    def __init__(self, repo_path):
        self.repo_path = Path(repo_path)
        self.report_dir = self.repo_path / "reports"
        self.report_dir.mkdir(exist_ok=True)

    def get_repo_info(self):
        """获取仓库基本信息"""
        info = {
            "name": self.repo_path.name,
            "path": str(self.repo_path.absolute()),
            "git_url": None,
            "default_branch": "main",
            "is_new_clone": False
        }

        # 尝试获取 git 信息
        try:
            if (self.repo_path / ".git").exists():
                # 获取 remote url
                result = subprocess.run(
                    ["git", "-C", str(self.repo_path), "remote", "get-url", "origin"],
                    capture_output=True,
                    text=True
                )
                if result.returncode == 0:
                    info["git_url"] = result.stdout.strip()

                # 获取默认分支
                result = subprocess.run(
                    ["git", "-C", str(self.repo_path), "symbolic-ref", "--short", "HEAD"],
                    capture_output=True,
                    text=True
                )
                if result.returncode == 0:
                    info["default_branch"] = result.stdout.strip()
        except Exception:
            pass

        return info

    def get_file_structure(self):
        """获取目录结构"""
        files = []
        dirs = []

        for root, dir_names, file_names in os.walk(self.repo_path):
            # 跳过 .git 和 reports
            if '.git' in root or 'reports' in root:
                continue

            rel_path = Path(root).relative_to(self.repo_path)
            str_path = str(rel_path) if str(rel_path) != "." else ""

            for d in dir_names:
                if not d.startswith('.'):
                    dirs.append(str(Path(str_path) / d) if str_path else d)

            for f in file_names:
                if not f.startswith('.'):
                    files.append(str(Path(str_path) / f) if str_path else f)

        return {"files": files, "dirs": dirs}

    def get_language_stats(self):
        """获取语言统计"""
        languages = {"primary": None, "breakdown": {}}

        # 简单的文件扩展名统计
        ext_count = defaultdict(int)
        total_files = 0

        for root, dir_names, file_names in os.walk(self.repo_path):
            if '.git' in root or 'reports' in root:
                continue
            for file in file_names:
                ext = Path(file).suffix.lower()
                if ext:
                    ext_count[ext] += 1
                    total_files += 1

        # 映射扩展名到语言
        ext_to_lang = {
            '.py': 'Python',
            '.js': 'JavaScript',
            '.ts': 'TypeScript',
            '.jsx': 'JavaScript',
            '.tsx': 'TypeScript',
            '.java': 'Java',
            '.go': 'Go',
            '.rs': 'Rust',
            '.rb': 'Ruby',
            '.php': 'PHP',
            '.cpp': 'C++',
            '.c': 'C',
            '.h': 'C/C++',
            '.hpp': 'C++',
            '.cs': 'C#',
            '.swift': 'Swift',
            '.kt': 'Kotlin',
            '.sh': 'Shell',
            '.bash': 'Shell',
            '.html': 'HTML',
            '.css': 'CSS',
            '.scss': 'SCSS',
            '.md': 'Markdown',
            '.json': 'JSON',
            '.yaml': 'YAML',
            '.yml': 'YAML',
            '.xml': 'XML',
            '.sql': 'SQL'
        }

        lang_count = defaultdict(int)
        for ext, count in ext_count.items():
            lang = ext_to_lang.get(ext, ext[1:].upper() if ext else 'Unknown')
            lang_count[lang] += count

        languages["breakdown"] = dict(lang_count)

        # 确定主要语言
        if lang_count:
            languages["primary"] = max(lang_count.items(), key=lambda x: x[1])[0]

        return languages

    def get_dependencies(self):
        """获取依赖信息"""
        dependencies = {"runtime": [], "dev": []}

        # 常见依赖文件
        dep_files = {
            "requirements.txt": "Python",
            "setup.py": "Python",
            "pyproject.toml": "Python",
            "package.json": "JavaScript",
            "go.mod": "Go",
            "Cargo.toml": "Rust",
            "pom.xml": "Java",
            "build.gradle": "Java",
            "Gemfile": "Ruby",
            "composer.json": "PHP"
        }

        found_deps = []
        for dep_file, lang in dep_files.items():
            if (self.repo_path / dep_file).exists():
                found_deps.append(f"{dep_file} ({lang})")

        dependencies["runtime"] = found_deps
        return dependencies

    def find_important_files(self, structure):
        """识别重要文件"""
        important_files = []

        # 常见入口文件
        entrypoint_files = [
            "main.py", "__main__.py", "app.py", "index.py",
            "main.js", "index.js", "app.js",
            "main.ts", "index.ts", "app.ts",
            "main.go", "cmd/main.go",
            "src/main.rs", "main.rs",
            "Main.java", "Application.java"
        ]

        # 常见配置文件
        config_files = [
            "setup.py", "pyproject.toml", "requirements.txt",
            "package.json", "tsconfig.json", "webpack.config.js",
            "go.mod", "go.sum",
            "Cargo.toml", "Cargo.lock",
            "pom.xml", "build.gradle",
            "Dockerfile", "docker-compose.yml",
            ".env", "config.py", "config.json", "config.yaml"
        ]

        # README 和文档
        readme_files = ["README.md", "README", "readme.md", "Readme.md"]

        for file_path in structure["files"]:
            file_name = Path(file_path).name

            # 检查入口文件
            if file_name in entrypoint_files or (
                "main" in file_name.lower() and Path(file_path).suffix in [".py", ".js", ".ts", ".go", ".rs", ".java"]
            ):
                important_files.append({
                    "path": file_path,
                    "type": "entrypoint",
                    "complexity": "high",
                    "reason": "可能是程序入口点"
                })

            # 检查配置文件
            elif file_name in config_files:
                important_files.append({
                    "path": file_path,
                    "type": "config",
                    "complexity": "medium",
                    "reason": "项目配置文件"
                })

            # 检查 README
            elif file_name in readme_files:
                important_files.append({
                    "path": file_path,
                    "type": "readme",
                    "complexity": "low",
                    "reason": "项目说明文档"
                })

            # 检查核心目录下的文件
            elif any(part in ["src", "lib", "core", "internal", "pkg"] for part in Path(file_path).parts):
                if len(important_files) < 10:  # 限制数量
                    important_files.append({
                        "path": file_path,
                        "type": "source",
                        "complexity": "medium",
                        "reason": "核心源代码目录"
                    })

        return important_files[:15]  # 最多返回 15 个重要文件

    def get_git_info(self):
        """获取 git 信息"""
        git_info = {"recent_commits": [], "contributors": []}

        if not (self.repo_path / ".git").exists():
            return git_info

        try:
            # 获取最近提交
            result = subprocess.run(
                ["git", "-C", str(self.repo_path), "log", "--oneline", "-n", "20"],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                git_info["recent_commits"] = [
                    line.strip() for line in result.stdout.strip().split('\n') if line.strip()
                ]

            # 获取贡献者
            result = subprocess.run(
                ["git", "-C", str(self.repo_path), "shortlog", "-sn"],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                git_info["contributors"] = [
                    line.strip() for line in result.stdout.strip().split('\n') if line.strip()
                ]
        except Exception:
            pass

        return git_info

    def generate_structured_output(self, output_file=None):
        """生成结构化 JSON 输出"""
        repo_info = self.get_repo_info()
        structure = self.get_file_structure()
        languages = self.get_language_stats()
        dependencies = self.get_dependencies()
        important_files = self.find_important_files(structure)
        git_info = self.get_git_info()

        output = {
            "repo_info": repo_info,
            "structure": structure,
            "languages": languages,
            "dependencies": dependencies,
            "important_files": important_files,
            "git": git_info
        }

        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(output, f, indent=2, ensure_ascii=False)
            print(f"✅ 结构化数据已输出到: {output_file}")

        return output

    def generate_report_template(self):
        """生成报告模板"""
        structure = self.get_file_structure()
        languages = self.get_language_stats()
        repo_info = self.get_repo_info()

        readme_path = None
        for readme in ["README.md", "README", "readme.md", "Readme.md"]:
            if (self.repo_path / readme).exists():
                readme_path = readme
                break

        template = f"""# 项目分析报告

## 项目概述
- 项目名称: {repo_info['name']}
- 分析时间: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

### 项目用途
[请在此处填写项目的主要用途和目标]

### 技术栈
[请在此处列出主要技术栈和框架]

### 主要功能
[请在此处列出项目的核心功能]

---

## 架构分析

### 目录结构
```json
{json.dumps(structure, indent=2, ensure_ascii=False)}
```

### 模块关系
[请在此处描述主要模块之间的关系]

### 设计模式
[请在此处识别使用的设计模式]

---

## 核心模块

### [模块名称 1]
- 文件位置: [路径]
- 功能描述: [描述]
- 关键代码: [引用]

### [模块名称 2]
- 文件位置: [路径]
- 功能描述: [描述]
- 关键代码: [引用]

---

## 依赖关系

### 主要依赖
[请在此处列出主要依赖库及其用途]

### 内部依赖
[请在此处描述内部模块之间的依赖关系]

---

## 使用指南

### 安装
[请在此处描述安装步骤]

### 配置
[请在此处描述配置方法]

### 运行
[请在此处描述如何运行项目]

---

## 扩展建议

[请在此处提供可能的改进和扩展建议]

---

## 附录

### 语言统计
```
{languages}
```

### README 位置
{readme_path if readme_path else '未找到 README'}
"""

        report_path = self.report_dir / "分析报告.md"
        report_path.write_text(template, encoding='utf-8')
        print(f"✅ 报告模板已生成: {report_path}")

        return report_path


def main():
    if len(sys.argv) < 2:
        print(f"用法: {sys.argv[0]} <仓库路径> [--json <输出文件>]")
        print("\n选项:")
        print("  --json <文件>    输出结构化 JSON 到指定文件")
        sys.exit(1)

    repo_path = sys.argv[1]
    if not os.path.exists(repo_path):
        print(f"错误: 路径不存在: {repo_path}")
        sys.exit(1)

    analyzer = RepoAnalyzer(repo_path)

    # 检查是否需要输出 JSON
    json_file = None
    if "--json" in sys.argv:
        json_idx = sys.argv.index("--json")
        if json_idx + 1 < len(sys.argv):
            json_file = sys.argv[json_idx + 1]

    if json_file:
        analyzer.generate_structured_output(json_file)
    else:
        analyzer.generate_report_template()
        print("\n🎉 分析完成！请在 reports/ 目录中查看报告模板")


if __name__ == "__main__":
    main()
