# typescript-code-rules

一套现代 TypeScript/JavaScript 通用编码规范与 ESLint 规则集，封装为可被 AI 编程助手（Claude Code / Kimi Code 等）自动触发的 Skill。

规则覆盖类型安全、现代语言特性、设计可读性、异步并发、安全语义和浏览器 DOM 场景。可自动化部分同时使用 ESLint 核心规则与 `@typescript-eslint`；规则总数以 `scripts/rule-index.json` 为准，不在文档中硬编码。

## 能做什么

| 能力 | 说明 |
|---|---|
| 编码指导 | 写/改 TS 代码时按类别查询规则与 good/bad 示例 |
| Code Review 清单 | 对代码/diff 按强制规则逐条核查，输出问题与改法 |
| ESLint 配置生成 | 产出整套 `eslint.config.mjs` + tsconfig 建议 |
| 确定性 Lint 执行 | 不依赖项目自身配置，直接用内置规则集跑 ESLint |
| 浏览器条件审查 | 仅在 DOM 项目中检查查询、样式、监听器、批量更新和安全渲染 |

## 怎么用

通过 `@sqliang/agent-ext` CLI 安装本 Skill 后，在任意项目中以自然语言描述需求即可自动触发：

- 「TS 里数组类型用 `T[]` 还是 `Array<T>`？」
- 「帮我 review 一下 `src/utils.ts`，按强制规则逐条核对」
- 「这些独立请求如何并发，部分失败又要怎么处理？」
- 「新项目要配一套 TypeScript 的 ESLint 规则，帮我生成配置」
- 「检查这个组件的 DOM 事件清理和动态 HTML 是否安全」

也可以直接在本组件目录下运行脚本（只需要本机有 Node，零第三方脚本依赖）：

```bash
node scripts/generate-eslint-config.mjs
node scripts/generate-eslint-config.mjs --out ./my-project
node scripts/review-checklist.mjs --level error
node scripts/review-checklist.mjs --category variables-functions
node scripts/lint.mjs src/utils.ts
```

`lint.mjs` 通过 npx 临时使用 ESLint 9、TypeScript 和 typescript-eslint，并为临时配置解析实际的依赖导入路径；不会读取目标项目自身的 ESLint 配置。

## 目录结构

```text
typescript-code-rules/
├── SKILL.md
├── references/
│   ├── naming.md
│   ├── types.md
│   ├── assertions.md
│   ├── arrays-objects.md
│   ├── control-flow.md
│   ├── classes.md
│   ├── modules.md
│   ├── async.md
│   ├── enums.md
│   ├── variables-functions.md
│   ├── style.md
│   └── browser.md
└── scripts/
    ├── rule-index.json
    ├── generate-eslint-config.mjs
    ├── lint.mjs
    └── review-checklist.mjs
```

## 规则边界与级别

- **[强制]**（ESLint `error`）：必须遵守，review 不通过项。
- **[推荐]**（ESLint `warn`）：应当遵守，确有理由时可偏离。
- **[规范]**（`level: "style"`）：场景化设计或风格约定，无可靠自动化映射，靠 review 把关。
- 排版风格由项目 Formatter 统一执行；本 Skill 不强制 2/4 空格、引号、分号、行宽或运算符换行。
- `browser.md` 只适用于浏览器/DOM 项目，不作为 Node.js 或非 DOM 项目的强制检查项。

## 维护方式

`scripts/rule-index.json` 是所有规则的单一事实源。新增或修改规则时：

1. 在 `rule-index.json` 中增改条目；无自动化的规则使用 `eslintRule: null` 和 `level: "style"`。
2. 在对应 `references/*.md` 中同步规则标题、级别、解释和 good/bad 示例。
3. ESLint 核心规则直接写规则名；typescript-eslint 规则写完整名称，配置项放入 `RULE_OPTIONS`。
4. 更新 `tests/typescript-code-rules.test.mjs` 与 `tests/typescript-code-rules-examples.test.mjs`；good 示例必须通过真实 Lint，外部上下文在测试中显式声明，不允许出现未登记的 warning。
5. 修改 Lint 依赖时，正常执行与 fallback 必须共用固定且相互兼容的版本，并用全新 npm 缓存验证。
6. 运行组件脚本、真实 Lint fixture，以及仓库的 `pnpm test`、`pnpm validate` 和 `pnpm build`。

排版偏好不得包装成普遍强制标准；无可靠 ESLint 映射时不得虚构规则名。

## 规则来源与现代化加工

规则整理自公开的 JavaScript/ESNext/TypeScript 风格指南与 typescript-eslint 官方规则文档，包括仓库中的 `code-rules/JavaScript编码规范.md` 和 `code-rules/ESNext补充规范.md`。原文保留为资料源，不整篇复制进组件。

融合时按“保留、合并、现代化改写、排除”处理：

- 保留严格相等、字面量、不可变更新、事件清理等仍成立的原则。
- 合并 for-of、对象遍历、模块、class/super、Map/Set 和异步等重复内容。
- 将旧回调、原型继承、动态类型转换等示例改写为现代 TypeScript。
- 排除 AMD、Babel 5、TypeScript 1.6、旧 IE 兼容、陈旧性能微优化和强制 JSDoc 类型注释。
- 使用当前 ESLint 替代规则，清理废弃配置，并明确 Formatter 与项目环境边界。
