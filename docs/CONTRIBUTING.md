# 贡献指南

## 新增 Component

1. 选择最小能力边界，在 `components/<kind>/<id>/` 创建真实能力，不创建空占位。
2. 编写 `component.yaml`。Skill 额外提供标准 `SKILL.md`，复杂说明放入 `references/`。
3. 脚本只根据组件根和项目根解析路径，不写死用户名或 `.claude/skills` 等宿主目录。
4. 为外部程序声明 `dependencies.external`，但不得在脚本中自动安装系统依赖。
5. 将组件加入合适的 Plugin/Profile；不要把 `deprecated` 能力加入默认组合。

## 本地闭环

```bash
pnpm install
pnpm validate
pnpm test
pnpm build
```

随后检查：

- `dist/catalog.json` 是否包含正确版本和状态；
- `dist/projections/<plugin-or-profile>/<id>/<version>/` 的三端结果；
- 显式 Skill 在三端均禁止隐式调用；
- `agent-ext install ... --dry-run --json` 的计划；
- 临时项目中的重复安装、更新和卸载。

## 测试要求

- Manifest / 依赖算法：Node 单元测试。
- Adapter：固定输入和目标路径/内容断言。
- Python：至少 `--help` smoke test 与核心逻辑测试。
- PDF/OCR：伪造可执行文件，不要求 CI 安装系统 OCR。
- 安全：路径穿越、校验和、未管理冲突、本地修改保护。

## 发布

先合并并通过 CI，再创建独立 tag：

```text
component/<id>/vX.Y.Z
plugin/<id>/vX.Y.Z
profile/<id>/vX.Y.Z
cli/vX.Y.Z
```

Release workflow 生成只读 catalog、三端投影、ZIP/TAR 与 SHA-256。`cli/*` tag 从 `packages/cli` 发布公开 npm 包。发布前不要提交 `dist/`。
