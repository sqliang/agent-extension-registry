#!/usr/bin/env python3
"""
代码扫描器
文件分类、重要文件识别、代码复杂度分析
"""

import os
import sys
import json
import re
from pathlib import Path
from collections import defaultdict


class CodeScanner:
    def __init__(self, repo_path):
        self.repo_path = Path(repo_path)

    def calculate_complexity(self, file_path):
        """简单的代码复杂度计算"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

            lines = content.split('\n')
            line_count = len(lines)

            # 根据文件扩展名判断语言
            ext = Path(file_path).suffix.lower()

            # 简单复杂度指标
            complexity_score = 0

            # 基于行数的复杂度
            if line_count < 50:
                complexity_score += 1
            elif line_count < 200:
                complexity_score += 2
            elif line_count < 500:
                complexity_score += 3
            else:
                complexity_score += 4

            # 检查常见的复杂度模式
            if ext in ['.py', '.js', '.ts', '.jsx', '.tsx']:
                # 统计函数/类定义
                func_count = len(re.findall(r'\bdef\s+\w+|\bfunction\s+\w+|\bclass\s+\w+', content))
                if func_count > 10:
                    complexity_score += 1

                # 统计条件和循环
                control_flow = len(re.findall(r'\bif\b|\bfor\b|\bwhile\b|\bswitch\b|\bcatch\b', content))
                if control_flow > 30:
                    complexity_score += 1

                # 统计嵌套深度（通过缩进）
                max_indent = 0
                for line in lines:
                    indent = len(line) - len(line.lstrip())
                    if line.strip() and not line.strip().startswith('#') and not line.strip().startswith('//'):
                        max_indent = max(max_indent, indent // 4)
                if max_indent > 4:
                    complexity_score += 1

            return complexity_score

        except Exception:
            return 1

    def classify_file(self, file_path):
        """文件分类"""
        file_name = Path(file_path).name
        ext = Path(file_path).suffix.lower()
        parts = Path(file_path).parts

        # 测试文件
        test_patterns = ['test', 'tests', 'spec', 'specs', '__test__', '__tests__']
        if any(p.lower() in test_patterns for p in parts) or file_name.startswith('test_') or file_name.endswith('_test.' + ext[1:]):
            return 'test'

        # 文档文件
        doc_exts = ['.md', '.rst', '.txt', '.mdx']
        if ext in doc_exts or 'doc' in Path(file_path).parent.name.lower():
            return 'documentation'

        # 配置文件
        config_files = [
            'package.json', 'tsconfig.json', 'webpack.config.js', '.eslintrc',
            'setup.py', 'pyproject.toml', 'requirements.txt',
            'go.mod', 'go.sum', 'Cargo.toml',
            'pom.xml', 'build.gradle',
            'Dockerfile', 'docker-compose.yml', '.env',
            '.gitignore', '.gitattributes'
        ]
        config_exts = ['.json', '.yaml', '.yml', '.toml', '.cfg', '.conf', '.ini']
        if file_name in config_files or ext in config_exts:
            return 'config'

        # 源代码
        source_exts = ['.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.go', '.rs', '.rb', '.php', '.cpp', '.c', '.h', '.hpp', '.cs', '.swift', '.kt']
        if ext in source_exts:
            return 'source'

        # 资源文件
        resource_exts = ['.css', '.scss', '.html', '.xml', '.sql', '.csv', '.json']
        if ext in resource_exts:
            return 'resource'

        return 'other'

    def scan(self):
        """扫描整个仓库"""
        results = {
            "file_count": 0,
            "categories": defaultdict(list),
            "complex_files": [],
            "summary": {}
        }

        for root, dir_names, file_names in os.walk(self.repo_path):
            # 跳过隐藏目录
            dir_names[:] = [d for d in dir_names if not d.startswith('.')]

            for file_name in file_names:
                if file_name.startswith('.'):
                    continue

                file_path = Path(root) / file_name
                rel_path = str(file_path.relative_to(self.repo_path))

                # 跳过 reports 目录
                if 'reports' in Path(rel_path).parts:
                    continue

                results["file_count"] += 1

                # 分类
                category = self.classify_file(file_path)
                results["categories"][category].append(rel_path)

                # 复杂度分析（仅对源代码）
                if category == 'source':
                    complexity = self.calculate_complexity(file_path)
                    if complexity >= 3:
                        results["complex_files"].append({
                            "path": rel_path,
                            "complexity": complexity,
                            "label": "high" if complexity >= 4 else "medium"
                        })

        # 排序复杂文件
        results["complex_files"].sort(key=lambda x: x["complexity"], reverse=True)
        results["complex_files"] = results["complex_files"][:20]  # 最多 20 个

        # 摘要
        results["summary"] = {
            "total_files": results["file_count"],
            "categories": {cat: len(files) for cat, files in results["categories"].items()},
            "high_complexity_files": len([f for f in results["complex_files"] if f["label"] == "high"])
        }

        return results


def main():
    if len(sys.argv) != 2:
        print(f"用法: {sys.argv[0]} <仓库路径>")
        sys.exit(1)

    repo_path = sys.argv[1]
    if not os.path.exists(repo_path):
        print(f"错误: 路径不存在: {repo_path}")
        sys.exit(1)

    scanner = CodeScanner(repo_path)
    results = scanner.scan()

    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
