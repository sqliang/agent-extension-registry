# CLI 与安装契约

## 命令

```text
agent-ext list [--kind] [--status] [--target] [--json]
agent-ext info <kind:id>[@version] [--json]
agent-ext install <kind:id>[@range] --target <host>... [--root <dir>] [--dry-run] [--force] [--json]
agent-ext status [--root <dir>] [--json]
agent-ext update [kind:id] [--root <dir>] [--dry-run] [--force] [--json]
agent-ext uninstall <kind:id> [--root <dir>] [--dry-run] [--json]
agent-ext doctor [--target <host>] [--root <dir>] [--json]
agent-ext validate [path] [--json]
```

`--target` 可重复指定 `codex | claude | cursor`。非交互环境缺少目标时失败；交互环境只展示已经存在宿主目录的候选项，仍需用户选择。

## 冲突语义

| 情况 | 默认行为 | `--force` |
|---|---|---|
| 目标不存在 | 创建 | 创建 |
| 已管理且哈希未变 | 更新或幂等跳过 | 同默认 |
| 已管理但用户修改 | 拒绝 | 备份后替换 |
| 未管理同名文件 | 拒绝 | 备份后替换 |
| 卸载时哈希未变 | 删除 | 不适用 |
| 卸载时用户修改 | 保留并报告 | 不适用 |

## 锁文件

`agent-ext.lock.json` 是可提交的复现凭据，记录：

- 安装请求以及 Plugin/Profile 精确版本；
- 解析后的 Component 精确版本和依赖；
- Release URL、Git ref 与归档 SHA-256；
- 每个目标宿主和受管理文件的相对路径、内容哈希。

`.agent-ext/` 是本地临时目录、备份与离线缓存，不提交 Git。

## Registry 来源与离线缓存

CLI 在 Registry 仓库内运行时直接读取本地清单。否则读取 GitHub Release 的 HTTPS catalog，下载所需 Component 的 TAR 归档并验证 catalog 中的 SHA-256；验证成功的归档解压结果缓存在 `<root>/.agent-ext/cache/`，网络不可用时可复用已缓存 catalog 与组件。归档中的绝对路径、`..` 穿越路径和链接条目会被拒绝，也不会执行包内脚本。

开发和测试可设置：

- `AGENT_EXT_REGISTRY_ROOT`：本地 Registry 根目录。
- `AGENT_EXT_CATALOG_URL`：替代的 HTTPS catalog。
