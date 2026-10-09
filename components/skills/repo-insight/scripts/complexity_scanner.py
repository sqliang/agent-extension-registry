#!/usr/bin/env python3
"""
复杂度扫描脚本
找出 TOP 10 最复杂的文件（基于行数）
"""

import os
import sys
import json
from pathlib import Path


def scan_complex_files(repo_path, top_n=10):
    """扫描复杂文件"""
    source_extensions = {
        ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go", ".rs",
        ".rb", ".php", ".cpp", ".c", ".h", ".hpp", ".cs", ".swift", ".kt"
    }

    files = []

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
            ext = file_path.suffix.lower()

            # 跳过 reports 目录
            if 'reports' in Path(rel_path).parts:
                continue

            # 只处理源代码文件
            if ext not in source_extensions:
                continue

            # 统计行数
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = f.readlines()
                    line_count = len(lines)

                    if line_count > 50:  # 只记录超过 50 行的文件
                        files.append({
                            "path": rel_path,
                            "lines": line_count,
                            "reason": "file_size"
                        })
            except Exception:
                pass

    # 按行数排序，取前 N 个
    files.sort(key=lambda x: x["lines"], reverse=True)
    top_files = files[:top_n]

    return {"complex_files": top_files}


def main():
    if len(sys.argv) != 2:
        print(f"用法: {sys.argv[0]} <仓库路径>", file=sys.stderr)
        sys.exit(1)

    repo_path = sys.argv[1]
    if not os.path.exists(repo_path):
        print(f"错误: 路径不存在: {repo_path}", file=sys.stderr)
        sys.exit(1)

    results = scan_complex_files(repo_path)
    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
