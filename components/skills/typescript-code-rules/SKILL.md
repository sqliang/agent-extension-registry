---
name: typescript-code-rules
description: TypeScript 编码规范与 @typescript-eslint 规则集。编写、审查（review）、重构 TypeScript 代码，检查代码是否违反编码规范，生成或配置 ESLint/tsconfig，解释修复 @typescript-eslint 报错时使用。覆盖命名、类型、断言、数组对象、条件循环、类、模块、异步 Promise、枚举九大类别。
---

# TypeScript 编码规范 Skill

一套通用的 TypeScript 编码规范与 `@typescript-eslint` 规则集，由 87 条规则组成：每条规则包含级别（[强制]/[推荐]/[建议]）、一句话标题、解释、ESLint 配置和 good/bad 示例。可用于编码指导、Code Review、ESLint/tsconfig 配置生成、确定性 Lint 执行，以及解释 `@typescript-eslint` 报错含义。

## 能力路由表

| 能力 | 典型用户话术 | 走哪条路径 |
|---|---|---|
| 1. 编码指导：写/改 TS 代码时查规则与示例 | 「数组类型用 `T[]` 还是 `Array<T>`？」「interface 命名能不能加 I 前缀？」「帮我改成符合规范的写法」「`@typescript-eslint/no-floating-promises` 报错什么意思？」 | 按下方分类索引表读对应的 [references/](references/) 文件；按规则名定位时直接 grep `references/` |
| 2. Code Review 清单：逐条核查代码/diff | 「帮我 review 一下这个文件」「这个 MR 有没有违反编码规范？」「按强制规则逐条核对」 | 先用下方 [强制] 速查清单对照；需要完整核查模板时跑 `node scripts/review-checklist.mjs`（可加 `--level error`） |
| 3. ESLint 配置生成：为项目产出规则配置 | 「新项目要配一套 TypeScript ESLint 规则」「把规范落地成 eslint config」「tsconfig 该开哪些选项？」 | 跑 `node scripts/generate-eslint-config.mjs`，输出 eslint.config.mjs 内容 + tsconfig 建议；`--out <dir>` 直接写入文件 |
| 4. 确定性 Lint 执行：不依赖项目配置跑规则集 | 「用咱们的规则集跑一遍 lint」「不用项目的 eslint 配置扫一下这个文件」 | 跑 `node scripts/lint.mjs <文件或目录...>`；环境没有 npx 时会降级输出配置让用户自行执行 |

## tsconfig 建议

以下建议不进 references，由本文件和 `generate-eslint-config.mjs` 输出：

- [建议] `tsconfig.json` 开启 `strict`、`noImplicitReturns`、`noUnusedLocals`。
- [建议] `tsconfig.json` 开启 `allowSyntheticDefaultImports`，以便 `import React from 'react'` 代替 `import * as React from 'react'`。
- [建议] 使用 VS Code 编写 TypeScript。
- [强制] 文件结尾保留一个空行。

## [强制] 规则速查清单

最高频的强制规则一行式摘要，review 时可直接对照（完整清单见 references 与 `scripts/review-checklist.mjs`）：

1. 命名匹配规范：typeLike 用 PascalCase，variableLike 用 camelCase/UPPER_CASE，禁下划线开头结尾（[naming](references/naming.md)）
2. 接口/类型别名用 PascalCase，接口不加 I 前缀（[naming](references/naming.md)）
3. 数组类型：简单元素用 `T[]`，复杂元素用 `Array<T>`，只读用 `ReadonlyArray<T>`（[types](references/types.md)）
4. 基本类型用小写 `string/number/boolean`，禁用 `Object`/`Function`/`{}`（[types](references/types.md)）
5. 可推导的初始值不显式标注类型（[types](references/types.md)）
6. 联合/交叉类型不允许冗余成员（[types](references/types.md)）
7. `void` 只用于返回类型或泛型参数（[types](references/types.md)）
8. 重载函数/方法的声明必须相邻（[types](references/types.md)）
9. 禁 `any` 的不安全使用：不传参、不赋值、不调用、不访问成员、不返回（no-unsafe-* 系列）（[types](references/types.md)）
10. 禁止 `extends any` 等不必要的类型约束（[types](references/types.md)）
11. 接口不应为空（[types](references/types.md)）
12. 断言统一用 `as` 不用 `<>`；禁止不必要的类型断言；字面类型用 `as const`（[assertions](references/assertions.md)）
13. `!` 系列限制：禁多余非空断言、禁 `!` 混入 `??` 左操作数、禁 `!` 与 `===` 混用造成混淆（[assertions](references/assertions.md)）
14. 禁 `@ts-ignore`/`@ts-nocheck`，豁免报错用带说明的 `@ts-expect-error`；禁 tslint 命令注释（[assertions](references/assertions.md)）
15. 禁止 `for-in` 遍历数组（[arrays-objects](references/arrays-objects.md)）
16. 对象浅拷贝用 `...`，不用 `Object.assign`（[arrays-objects](references/arrays-objects.md)）
17. `+` 运算符两边类型必须一致且为 bigint/number/string；模板字符串禁 `any`/nullish（[control-flow](references/control-flow.md)）
18. 相等性判断用 `===`/`!==`（[control-flow](references/control-flow.md)）
19. 避免 `return undefined`，直接 `return`（[control-flow](references/control-flow.md)）
20. 类成员显式标注 protected/private，`public` 不写（[classes](references/classes.md)）
21. 禁类定义 `new` 方法、接口定义 `constructor` 方法（[classes](references/classes.md)）
22. 模块统一 ES2015 `import/export`：禁 `require`、禁 `namespace`、禁无用空 `export {}`、禁 `/// <reference path>`、同路径只 import 一次（[modules](references/modules.md)）
23. 禁 `await` 非 thenable 值；Promise 不做条件判断（须先 await）（[async](references/async.md)）
24. void 表达式只在语句位置；不用无意义的 `void` 运算符（[async](references/async.md)）
25. 枚举：禁重复成员值、成员值只用常量字面量、用 `const enum` 声明（[enums](references/enums.md)）

## 分类索引表

| references 文件 | 覆盖内容 |
|---|---|
| [naming.md](references/naming.md) | 命名：naming-convention 配置、接口/类型别名 PascalCase、禁 I 前缀、.ts/.tsx 扩展名 |
| [types.md](references/types.md) | 类型声明：T[] vs Array<T>、禁 any/Object/Function、可推导类型不标注、Record 风格、interface vs type、readonly、重载相邻、no-unsafe-* 系列 |
| [assertions.md](references/assertions.md) | 断言与非空：as vs <>、禁 ! 滥用、??/?. 优先、as const、ts-expect-error 替代 ts-ignore、ban-tslint-comment |
| [arrays-objects.md](references/arrays-objects.md) | 数组与对象：... 浅拷贝、includes、禁 delete 计算键、禁 for-in 遍历数组、startsWith/endsWith |
| [control-flow.md](references/control-flow.md) | 条件与循环：===、for-of 优先、switch 穷尽、不必要条件/布尔比较/限定符、+/模板字符串类型限制、this 别名 |
| [classes.md](references/classes.md) | 类：可访问性标注、成员顺序、readonly、返回 this、禁类当命名空间、参数属性、每文件一类 |
| [modules.md](references/modules.md) | 模块：ES2015 import/export、禁 require/namespace/reference path、同路径只导入一次、资源类型声明 |
| [async.md](references/async.md) | 异步与 Promise：await-thenable、no-floating-promises、no-misused-promises、void 表达式与运算符 |
| [enums.md](references/enums.md) | 枚举：const enum、显式初始化、字面量成员、禁重复值 |

## 脚本用法

所有脚本零第三方依赖，只需要本机有 node；数据均来自 [scripts/rule-index.json](scripts/rule-index.json)（单一事实源）。

生成 ESLint flat config 与 tsconfig 建议（默认打印到 stdout，`--out <dir>` 写入 `eslint.config.mjs` 和 `tsconfig.recommendations.json`）：

```bash
node scripts/generate-eslint-config.mjs
node scripts/generate-eslint-config.mjs --out ./my-project
```

生成 Code Review 核查清单（Markdown 复选框，按类别分组，强制规则在前；`--level error` 只输出强制项）：

```bash
node scripts/review-checklist.mjs
node scripts/review-checklist.mjs --level error
```

用内置规则集对目标跑 ESLint（环境需要有 npx；没有 npx 时会降级为输出临时配置路径，由用户自行执行）：

```bash
node scripts/lint.mjs src/utils.ts
node scripts/lint.mjs src/ packages/
```

## 级别约定

- ESLint `error` = **[强制]**：必须遵守，review 不通过项。
- ESLint `warn` = **[推荐]**：应当遵守，确有理由时可偏离。
- 规范版独有规则（无对应 ESLint 规则，`rule-index.json` 中 `level: "style"`）：保留源文档的 [强制]/[建议] 标注，属于风格约定，无法用 ESLint 自动检测，靠 review 把关。
