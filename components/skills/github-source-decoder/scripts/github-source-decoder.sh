#!/bin/bash
# 仓库源码解读准备脚本
# 准备仓库并输出结构化 JSON 数据

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
GITHUB_SOURCES_DIR="$HOME/github-sources"
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="/tmp"

# 确保目录存在
mkdir -p "$GITHUB_SOURCES_DIR"

print_info() {
    echo -e "${BLUE}[信息]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[成功]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[警告]${NC} $1"
}

print_error() {
    echo -e "${RED}[错误]${NC} $1"
}

show_usage() {
    cat <<EOF
仓库源码解读准备工具

用法:
    # 模式 1: 分析 GitHub 仓库
    $0 <GitHub仓库URL> [分支名]

    # 模式 2: 分析当前目录
    $0

示例:
    $0 https://github.com/user/repo.git
    $0 https://github.com/user/repo.git main
    $0

输出:
    结构化 JSON 数据，包含仓库信息

EOF
}

is_git_repo() {
    local dir="$1"
    [ -d "$dir/.git" ]
}

extract_repo_name() {
    local url="$1"
    local repo_name=$(basename "$url" .git)
    echo "$repo_name"
}

clone_repo() {
    local url="$1"
    local branch="$2"
    local repo_name=$(extract_repo_name "$url")
    local repo_path="$GITHUB_SOURCES_DIR/$repo_name"

    print_info "仓库名称: $repo_name"
    print_info "目标路径: $repo_path"

    if [ -d "$repo_path" ]; then
        print_warning "仓库已存在，正在更新..."
        cd "$repo_path"
        git pull
        cd - > /dev/null
    else
        print_info "正在 Clone 仓库..."
        if [ -n "$branch" ]; then
            git clone -b "$branch" "$url" "$repo_path"
        else
            git clone "$url" "$repo_path"
        fi
    fi

    echo "$repo_path"
}

main() {
    echo "=========================================="
    echo "  仓库源码解读准备工具"
    echo "=========================================="
    echo ""

    local repo_path=""
    local mode=""

    if [ $# -eq 0 ]; then
        # 模式 2: 当前目录模式
        local current_dir=$(pwd)
        print_info "模式: 当前目录分析"

        if ! is_git_repo "$current_dir"; then
            print_error "当前目录不是 Git 仓库: $current_dir"
            echo ""
            show_usage
            exit 1
        fi

        repo_path="$current_dir"
        mode="current"
        print_success "使用当前目录: $repo_path"

    elif [ $# -ge 1 ]; then
        # 模式 1: URL 模式
        local repo_url="$1"
        local branch="$2"
        print_info "模式: GitHub URL 分析"

        print_info "步骤 1/3: Clone 仓库"
        repo_path=$(clone_repo "$repo_url" "$branch")

        if [ ! -d "$repo_path" ]; then
            print_error "Clone 失败"
            exit 1
        fi

        mode="url"
        print_success "仓库已准备: $repo_path"
    fi

    echo ""
    print_info "步骤 2/3: 运行分析脚本"

    # 生成临时 JSON 文件
    local tmp_json=$(mktemp "$TMP_DIR/github-source-decoder-XXXXXX.json")

    # 运行 analyze_repo.py 输出结构化 JSON
    local analyze_script="$SKILL_DIR/scripts/analyze_repo.py"
    if [ -f "$analyze_script" ]; then
        python3 "$analyze_script" "$repo_path" --json "$tmp_json"
    else
        print_error "分析脚本未找到: $analyze_script"
        exit 1
    fi

    echo ""
    print_info "步骤 3/3: 输出结果"

    # 输出 JSON 到 stdout
    if [ -f "$tmp_json" ]; then
        # 添加仓库路径信息
        python3 -c "import json, sys; data = json.load(sys.stdin); data['repo_info']['path'] = '$repo_path'; print(json.dumps(data, indent=2, ensure_ascii=False))" < "$tmp_json" 2>/dev/null || cat "$tmp_json"

        # 清理
        rm "$tmp_json"
    fi

    echo ""
}

main "$@"
