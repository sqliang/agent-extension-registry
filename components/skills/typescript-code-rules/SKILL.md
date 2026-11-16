---
name: typescript-code-rules
description: TypeScript 与 JavaScript 现代编码规范及 ESLint 规则集。编写、审查（review）、重构 TypeScript 代码，检查编码规范，生成或配置 ESLint/tsconfig，解释修复 ESLint 或 @typescript-eslint 报错时使用。覆盖命名、类型、断言、数组对象、条件循环、类、模块、异步、枚举、变量函数、风格注释，以及浏览器 DOM 项目的条件规则。
---

# TypeScript 编码规范 Skill

一套现代 TypeScript/JavaScript 通用编码规范，由 `scripts/rule-index.json` 统一驱动。规则包含级别（[强制]/[推荐]/[规范]）、解释、可用的 ESLint 配置和 good/bad 示例，可用于编码指导、Code Review、ESLint/tsconfig 配置生成、确定性 Lint 执行，以及解释 ESLint 报错。

## 能力路由表

| 能力 | 典型用户话术 | 走哪条路径 |
|---|---|---|
| 1. 编码指导：写/改 TS 代码时查规则与示例 | 「数组类型用 `T[]` 还是 `Array<T>`？」「Promise 并行怎么写？」「帮我改成符合规范的写法」「`@typescript-eslint/no-floating-promises` 报错什么意思？」 | 按下方分类索引读对应 [references/](references/) 文件；按规则名定位时直接 grep `references/` |
| 2. Code Review 清单：逐条核查代码/diff | 「帮我 review 一下这个文件」「这个 MR 有没有违反编码规范？」「按强制规则逐条核对」 | 先用下方 [强制] 速查清单；完整核查时跑 `node scripts/review-checklist.mjs`（可加 `--level error` 或 `--category`） |
| 3. ESLint 配置生成：为项目产出规则配置 | 「新项目要配一套 TypeScript ESLint 规则」「把规范落地成 eslint config」「tsconfig 该开哪些选项？」 | 跑 `node scripts/generate-eslint-config.mjs`；`--out <dir>` 写入配置与 tsconfig 建议 |
| 4. 确定性 Lint 执行：不依赖项目配置跑规则集 | 「用咱们的规则集跑一遍 lint」「不用项目的 eslint 配置扫一下这个文件」 | 跑 `node scripts/lint.mjs <文件或目录...>`；没有 npx 时输出配置供用户自行执行 |
| 5. 浏览器 DOM Review | 「检查这个组件的 DOM 操作」「事件监听有没有泄漏？」「动态 HTML 是否安全？」 | 额外读取 [browser.md](references/browser.md)；非 DOM 项目跳过该分类 |

## 规则适用边界

- 正确性、类型安全和安全性优先于可读性建议，可读性建议优先于排版偏好。
- 缩进、引号、分号、行宽和运算符换行由项目 Formatter 决定，本 Skill 不覆盖项目已有配置。
- `browser` 分类只用于浏览器/DOM 项目；Node.js 和非 DOM 项目不将其作为强制检查项。
- 历史 AMD、旧 IE、Babel 5、TypeScript 1.6 等环境建议不属于本规范。

## tsconfig 建议

以下建议由本文件和 `generate-eslint-config.mjs` 输出：

- [建议] 开启 `strict`、`noImplicitReturns`、`noUnusedLocals`。
- [建议] 需要 CommonJS 默认导入互操作时开启 `esModuleInterop`；它会同时启用 `allowSyntheticDefaultImports`。仅开启后者主要影响类型检查，不能单独保证运行时互操作。
- [建议] 编辑器可配置保存时格式化；编辑器偏好不属于 `compilerOptions`。

## [强制] 规则速查清单

最高频的强制规则一行式摘要，完整清单见 references 与 `scripts/review-checklist.mjs`：

1. 命名匹配规范：typeLike 用 PascalCase，variableLike 用 camelCase/UPPER_CASE（[naming](references/naming.md)）
2. 数组类型按复杂度选择 `T[]`/`Array<T>`，只读用 `ReadonlyArray<T>`（[types](references/types.md)）
3. 基本类型用小写，禁用包装对象类型、空对象类型和不安全的 `any` 使用（[types](references/types.md)）
4. 可推导的初始值不显式标注类型，重载声明相邻（[types](references/types.md)）
5. 禁止不必要和额外的类型断言与非空断言（[assertions](references/assertions.md)）
6. 禁 `@ts-ignore`/`@ts-nocheck`，豁免报错用带说明的 `@ts-expect-error`（[assertions](references/assertions.md)）
7. 禁止 `for-in` 遍历数组，禁止修改原生对象和宿主对象原型（[arrays-objects](references/arrays-objects.md)）
8. 相等性判断用 `===`/`!==`，控制语句始终使用花括号（[control-flow](references/control-flow.md)）
9. 禁止 `eval`、字符串隐式执行、`new Function` 和 `with`（[control-flow](references/control-flow.md)）
10. 类成员显式标注 protected/private，`public` 不写（[classes](references/classes.md)）
11. 禁 `require`、`namespace` 和已有其他导入导出时的空 `export {}`（[modules](references/modules.md)）
12. 禁 `await` 非 thenable 值，Promise 不做条件判断，void 表达式只在语句位置（[async](references/async.md)）
13. 使用 `let`/`const`，不再重新赋值的绑定用 `const`，剩余参数替代 `arguments`（[variables-functions](references/variables-functions.md)）
14. 枚举禁重复成员值，成员值只用常量字面量（[enums](references/enums.md)）

## 分类索引表

| references 文件 | 覆盖内容 |
|---|---|
| [naming.md](references/naming.md) | 命名：naming-convention、接口/类型别名、文件扩展名 |
| [types.md](references/types.md) | 类型声明：数组类型、限制内置别名、禁 any、Record、interface/type、重载和 no-unsafe-* |
| [assertions.md](references/assertions.md) | 断言与非空：as、非空断言、??/?.、as const、TS 指令注释 |
| [arrays-objects.md](references/arrays-objects.md) | 数组与对象：浅拷贝、字面量、方法简写、Map/Set、原型保护、不可变更新 |
| [control-flow.md](references/control-flow.md) | 条件与循环：严格相等、for-of、switch、花括号、提前返回、禁动态代码执行 |
| [classes.md](references/classes.md) | 类：可访问性、成员顺序、readonly、参数属性、class/super |
| [modules.md](references/modules.md) | 模块：ES2015 import/export、顶层导入、命名导出、资源类型声明 |
| [async.md](references/async.md) | 异步与 Promise：floating/misused promises、async/await、并发与组合器 |
| [enums.md](references/enums.md) | 枚举：显式初始化、字面量成员、const enum 构建兼容性 |
| [variables-functions.md](references/variables-functions.md) | 变量与函数：let/const、默认/剩余参数、解构、this、options 对象、函数职责 |
| [style.md](references/style.md) | 风格与注释：UTF-8、末尾换行、Formatter 边界、逻辑空行、TSDoc |
| [browser.md](references/browser.md) | 浏览器条件规则：DOM 查询、classList、监听器清理、批量更新、安全渲染 |

## 脚本用法

所有脚本零第三方依赖，只需要本机有 Node；数据均来自 [scripts/rule-index.json](scripts/rule-index.json)（单一事实源）。

```bash
# 生成 ESLint flat config 与 tsconfig 建议
node scripts/generate-eslint-config.mjs
node scripts/generate-eslint-config.mjs --out ./my-project

# 生成 Code Review 核查清单
node scripts/review-checklist.mjs
node scripts/review-checklist.mjs --level error
node scripts/review-checklist.mjs --category variables-functions

# 用内置规则集对目标跑 ESLint
node scripts/lint.mjs src/utils.ts
node scripts/lint.mjs src/ packages/
```

## 级别约定

- ESLint `error` = **[强制]**：必须遵守，review 不通过项。
- ESLint `warn` = **[推荐]**：应当遵守，确有理由时可偏离。
- `level: "style"` = **[规范]**：场景化设计或风格约定，无可靠自动化映射，靠 review 把关；浏览器规则还需满足其环境条件。
