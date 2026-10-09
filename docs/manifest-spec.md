# Manifest 规范

机器可读 JSON Schema 位于 `packages/schemas/json/`；运行时还会执行 SemVer、依赖闭环、目录边界与宿主兼容性校验。

## Component

```yaml
schemaVersion: 1
id: repo-insight
kind: skill
version: 1.0.0
status: beta
description: Evidence-backed repository analysis.
entry: SKILL.md
invocation: automatic
targets: [codex, claude, cursor]
dependencies:
  components:
    - id: another-component
      version: ^1.0.0
      optional: false
  external:
    - command: python3
      required: true
      description: Python runtime.
```

- `id` 必须为 kebab-case。
- `version` 必须是精确 SemVer。
- `status` 为 `experimental | beta | stable | deprecated`。
- `kind` 为 `skill | agent | hook | mcp`。
- `invocation` 为 `automatic | explicit`。
- `entry` 必须留在组件目录内。
- `targets` 至少包含一个宿主。
- 外部依赖只用于 `doctor` 诊断，不会自动安装。

Skill 的 `SKILL.md` frontmatter 只保留 Skill 标准字段；版本、兼容性、宿主与依赖均归 `component.yaml`。

## Plugin

```yaml
schemaVersion: 1
id: repo-insight
version: 1.0.0
status: beta
description: Repository analysis plugin.
components:
  - id: repo-insight
    version: ^1.0.0
```

Plugin 至少包含一个 Component。

## Profile

```yaml
schemaVersion: 1
id: ai-coding
version: 1.0.0
status: beta
description: AI coding workflows.
plugins:
  - id: git-workflow
    version: ^1.0.0
components: []
```

Profile 至少引用一个 Plugin 或 Component。所有范围在安装时解析为精确版本并写入锁文件。
