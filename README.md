# Agent Extension Registry

[![CI](https://github.com/sqliang/agent-extension-registry/actions/workflows/ci.yml/badge.svg)](https://github.com/sqliang/agent-extension-registry/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A520-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

面向 Codex、Claude Code 与 Cursor 的可复用 Agent 扩展注册表。仓库只保存能力源、脱敏示例与测试夹具，不保存真实博客、知识库、PDF 或日程数据。

## 核心模型

| 概念 | 作用 | 清单 |
|---|---|---|
| Component | 最小能力单元：Skill、Agent、Hook、MCP | `component.yaml` |
| Plugin | 一组相关 Component 的可发布安装包 | `plugin.yaml` |
| Profile | 面向场景的组合方案 | `profile.yaml` |
| Adapter | 将同一能力投影为宿主原生目录和格式 | TypeScript package |

Agent Plugins 1.0 只作为 Skills 与 MCP 的可移植底座。Agent、Hook、Rule 等宿主差异由 Adapter 或组件的 `hosts/<target>/` 变体表达，不伪造跨端一致性。

## 快速开始

要求 Node.js 20+ 与 pnpm：

```bash
pnpm install
pnpm validate
pnpm test
pnpm build
```

在本仓库开发时，可以直接运行构建后的 CLI：

```bash
node packages/cli/dist/bin.js list
node packages/cli/dist/bin.js info profile:ai-coding
node packages/cli/dist/bin.js install profile:ai-coding \
  --target codex --target claude --target cursor \
  --root /path/to/project --dry-run
```

发布后的公共入口为：

```bash
pnpm dlx @sqliang/agent-ext install profile:learning --target codex --root .
```

所有命令均支持 `--json`。非交互环境必须显式提供至少一个 `--target`。

开发仓库内优先读取本地 Registry；独立安装的 CLI 从 GitHub Release 的只读 catalog 下载组件归档，并把已校验归档缓存到目标项目的 `.agent-ext/cache/`。可用 `AGENT_EXT_REGISTRY_ROOT` 指向本地 Registry，或用 `AGENT_EXT_CATALOG_URL` 覆盖 HTTPS catalog 地址。

## 初始 Profiles

| Profile | 内容 |
|---|---|
| `profile:ai-coding` | Git 工作流、显式提交工作流、Repo Insight |
| `profile:insight-stack-content` | Frontmatter、Obsidian Smart Links 与三个显式操作 Skill |
| `profile:learning` | PDF Reader、Frontmatter |

`github-source-decoder` 已标记为 `deprecated`，不会出现在默认列表和 Profile 中。日程管理与日常效率暂不发布空 Profile。

## 安全与可复现性

- 安装前先生成计划并在临时目录校验，再以同文件系统 rename 写入。
- 默认拒绝覆盖未受管理文件；`--force` 也会先备份到 `.agent-ext/backups/`。
- 重复安装相同版本幂等。
- 卸载只删除锁文件记录且哈希未变化的文件，用户改动会保留并报告。
- `agent-ext.lock.json` 锁定版本、Git ref、Release URL、组件归档哈希、目标与每个受管理文件哈希。
- 下载归档必须验证 SHA-256 和路径，组件包不会执行生命周期脚本。
- `doctor` 只诊断外部依赖，不自动安装 Homebrew、uv、Poppler、Tesseract 等系统软件。

## 仓库结构

```text
agent-extension-registry/
├── components/                 # 唯一能力源
│   └── skills/
├── plugins/                    # 版本化组件组合
├── profiles/                   # 场景套装
├── packages/
│   ├── cli/                    # @sqliang/agent-ext
│   ├── core/                   # 解析、计划、锁定与安全写入
│   ├── schemas/                # 清单类型与校验
│   └── adapters/{codex,claude,cursor}/
├── scripts/                    # 校验与只读 catalog / 产物生成
├── tests/                      # 安装与安全测试
└── docs/
```

`dist/` 只由构建和发布流程生成，不提交 Git。

## 贡献闭环

新增组件时：创建组件源与 `component.yaml` → 加入 Plugin/Profile → 运行 `pnpm validate && pnpm test && pnpm build` → 检查 `dist/projections/` 三端产物 → 按独立 tag 发布。完整步骤见 [贡献指南](docs/CONTRIBUTING.md)，模型定义见 [清单规范](docs/manifest-spec.md)，CLI 行为见 [安装契约](docs/cli-contract.md)。

## 版本与发布

```text
component/<id>/v1.2.3
plugin/<id>/v1.2.3
profile/<id>/v1.2.3
cli/v1.2.3
```

GitHub Actions 校验 Schema、Skills、Adapters、Python 脚本与安全用例，并在 tag 发布时生成三端投影、ZIP/TAR 和 SHA-256。`cli/*` tag 额外发布 `@sqliang/agent-ext`。

## License

[MIT](LICENSE)
