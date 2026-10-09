#!/usr/bin/env python3
"""
简单文件统计脚本
统计仓库中的文件数量和代码行数
"""

import os
import sys
import json
from pathlib import Path
from collections import defaultdict


def count_files(repo_path):
    """统计文件数量和行数"""
    results = {
        "total_files": 0,
        "by_extension": defaultdict(int),
        "total_lines": 0,
        "source_lines": 0,
        "source_extensions": {
            ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go", ".rs",
            ".rb", ".php", ".cpp", ".c", ".h", ".hpp", ".cs", ".swift", ".kt"
        }
    }

    for root, dir_names, file_names in os.walk(repo_path):
        # 跳过隐藏目录
        dir_names[:] = [d for d in dir_names if not d.startswith('.')]

        # 跳过常见的依赖目录
        skip_dirs = {'node_modules', 'vendor', '.git', 'dist', 'build', 'target', '__pycache__'}
        dir_names[:] = [d for d in dir_names if d not in skip_dirs]

        for file_name in file_names:
            if file_name.startswith('.'):
                continue

            file_path = Path(root) / file_name
            rel_path = str(file_path.relative_to(repo_path))

            # 跳过 reports 目录
            if 'reports' in Path(rel_path).parts:
                continue

            results["total_files"] += 1

            ext = file_path.suffix.lower()
            if ext:
                results["by_extension"][ext] += 1

            # 统计行数
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = f.readlines()
                    line_count = len(lines)
                    results["total_lines"] += line_count

                    if ext in results["source_extensions"]:
                        results["source_lines"] += line_count
            except Exception:
                pass

    # 转换为普通 dict 以便 JSON 序列化
    results["by_extension"] = dict(results["by_extension"])
    del results["source_extensions"]

    return results


def main():
    if len(sys.argv) != 2:
        print(f"用法: {sys.argv[0]} <仓库路径>", file=sys.stderr)
        sys.exit(1)

    repo_path = sys.argv[1]
    if not os.path.exists(repo_path):
        print(f"错误: 路径不存在: {repo_path}", file=sys.stderr)
        sys.exit(1)

    results = count_files(repo_path)
    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
