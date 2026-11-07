# typescript-code-rules

一套通用的 TypeScript 编码规范与 `@typescript-eslint` 规则集，封装为可被 AI 编程助手（Claude Code / Kimi Code 等）自动触发的 Skill。

内含 **87 条规则**：67 条可自动化检测的 `@typescript-eslint` 规则 + 20 条风格约定，每条规则包含级别（[强制]/[推荐]/[建议]）、解释、ESLint 配置和 good/bad 示例。

## 能做什么

| 能力 | 说明 |
|---|---|
| 编码指导 | 写/改 TS 代码时按类别查询规则与 good/bad 示例 |
| Code Review 清单 | 对代码/diff 按 [强制] 规则逐条核查，输出问题与改法 |
| ESLint 配置生成 | 一键产出整套 `eslint.config.mjs` + tsconfig 建议 |
| 确定性 Lint 执行 | 不依赖项目自身配置，直接用内置规则集跑 ESLint |

## 怎么用

通过 `@sqliang/agent-ext` CLI 安装本 Skill 后，不需要显式命令，在任意项目中以自然语言描述需求即可自动触发：

- 「TS 里数组类型用 `T[]` 还是 `Array<T>`？」
- 「帮我 review 一下 `src/utils.ts`，按强制规则逐条核对」
- 「新项目要配一套 TypeScript 的 ESLint 规则，帮我生成配置」
- 「`@typescript-eslint/no-floating-promises` 这个报错什么意思？怎么改？」
- 「用咱们的规则集跑一遍 lint，看看 `src/` 下有多少问题」

也可以直接在本组件目录下运行脚本（只需要本机有 Node，零第三方依赖）：

```bash
# 生成 ESLint flat config + tsconfig 建议（默认打印，--out 写入文件）
node scripts/generate-eslint-config.mjs
node scripts/generate-eslint-config.mjs --out ./my-project

# 生成 Code Review 核查清单（--level error 只输出强制项）
node scripts/review-checklist.mjs --level error

# 用内置规则集对目标跑 ESLint（需要 npx）
node scripts/lint.mjs src/utils.ts
```

## 目录结构

```
typescript-code-rules/
├── SKILL.md                     # Skill 入口：能力路由、强制规则速查、分类索引（供 AI 加载）
├── references/                  # 规则详解，按主题分 9 个文件，按需加载
│   ├── naming.md                # 命名：PascalCase/camelCase、禁 I 前缀、naming-convention
│   ├── types.md                 # 类型声明：T[] vs Array<T>、禁 any、no-unsafe-* 系列等 22 条
│   ├── assertions.md            # 断言与非空：as vs <>、禁 ! 滥用、??/?. 优先、ts-expect-error
│   ├── arrays-objects.md        # 数组与对象：... 浅拷贝、includes、禁 for-in 遍历数组
│   ├── control-flow.md          # 条件与循环：===、for-of、switch 穷尽、+/模板字符串类型限制
│   ├── classes.md               # 类：可访问性、成员顺序、readonly、参数属性、返回 this
│   ├── modules.md               # 模块：ES2015 import/export、禁 require/namespace
│   ├── async.md                 # 异步与 Promise：await-thenable、floating/misused promises
│   └── enums.md                 # 枚举：const enum、显式初始化、字面量成员
└── scripts/
    ├── rule-index.json          # 单一事实源：87 条规则的元数据（级别/类别/说明/出处）
    ├── generate-eslint-config.mjs  # 生成 eslint.config.mjs + tsconfig 建议
    ├── lint.mjs                 # 用内置规则集跑 ESLint
    └── review-checklist.mjs     # 生成 Review 核查清单
```

## 规则级别约定

- **[强制]**（ESLint `error`）：必须遵守，review 不通过项
- **[推荐]**（ESLint `warn`）：应当遵守，确有理由时可偏离
- **风格约定**（`rule-index.json` 中 `level: "style"`）：无对应 ESLint 规则，无法自动检测，靠 review 把关

## 维护方式

`scripts/rule-index.json` 是所有规则的唯一数据源，三个脚本都从这里读数据。新增或修改规则时：

1. 在 `rule-index.json` 中增改条目（`eslintRule` 没有对应规则时填 `null`，`level` 填 `style`）
2. 在对应 `references/*.md` 文件中增改规则小节（标题与 index 中的 `title` 保持一致）
3. 若规则带 ESLint 配置项，在 `generate-eslint-config.mjs` 的 `RULE_OPTIONS` 表中补上配置
4. 跑一遍 `node scripts/generate-eslint-config.mjs` 和 `node scripts/review-checklist.mjs` 验证输出

## 规则来源与加工说明

规则整理自公开的 TypeScript 风格指南与 typescript-eslint 官方规则文档。封装时做了以下加工：修复源文档 OCR 噪音（残缺代码块、错别字）、重叠规则以 ESLint 版为准去重、剔除出处相关信息。本 Skill 是独立的加工产物。
