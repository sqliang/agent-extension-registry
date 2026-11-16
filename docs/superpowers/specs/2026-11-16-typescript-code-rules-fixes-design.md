# typescript-code-rules 问题修复设计

## 背景

对 `components/skills/typescript-code-rules` 的审查确认了两类高优先级问题：`no-implied-eval` 配置未生效，以及跨目录或 fallback 执行可能在没有检查目标文件的情况下返回成功。此外还存在 bad 示例未覆盖、非空断言示例无效、异步风格文档矛盾和命名规则不兼容常见外部协议字段的问题。

现有 `pnpm test`、`pnpm validate` 和 `pnpm build` 均通过，因此修复重点是补充能够暴露这些行为的测试，再进行定点修改。

## 目标

1. 消除 Lint 漏检和未检查却返回成功的假绿。
2. 确保每个可自动化规则的 bad 示例都能被对应规则捕获。
3. 修正文档示例，使规则正文、示例和实际配置一致。
4. 有限兼容带引号的外部属性及双前导下划线元数据属性。
5. 保留现有命令行接口和工作区已有修改，不引入新依赖或无关重构。

## 非目标

- 不重写为 ESLint Node API 调用。
- 不调整其他规则的强制、推荐或规范级别。
- 不扩展本次审查之外的新规则。
- 不放开普通 `_privateProperty`、任意 snake_case 或任意首尾下划线。
- 不额外修改当前未提交的组件版本 `1.1.0`。
- 不执行 git commit 或 push。

## 总体方案

采用定点修复：保留现有 `lint.mjs`、规则索引和配置生成器的结构，分别修正执行路径、规则名称和命名例外，并用真实 ESLint 执行结果作为验收依据。

实施遵循 RED → GREEN → REFACTOR：每类行为先添加能够复现现有缺陷的测试，确认测试因预期原因失败，再写最小实现使其通过。

## Lint 路径与退出码设计

涉及文件：`components/skills/typescript-code-rules/scripts/lint.mjs`。

### 执行根目录

1. 将每个目标解析为绝对路径，并保留现有的目标存在性检查。
2. 文件目标以其父目录参与根目录计算，目录目标以目录自身参与计算。
3. 单个目标直接使用对应目录；多个目标使用所有目标目录的公共祖先。
4. 从该执行根目录启动 ESLint，将目标转换为相对执行根目录的路径。
5. 保留 `--` 的目标分隔语义，继续支持以连字符开头的文件名。
6. 如果 Windows 不同盘符等情况导致目标没有公共根目录，输出明确错误并返回非零，不尝试静默逐项目跳过。

该设计让 ESLint 的 base path 始终覆盖所有目标，避免绝对文件仅产生 `File ignored because outside of base path` 警告并返回成功，也避免绝对目录直接退出 2。

### fallback

1. 继续将临时配置和依赖放在系统临时目录。
2. 使用 `npm --prefix <配置目录> install --no-save ...` 安装固定版本依赖。
3. 执行命令进入目标公共根目录，而不是进入配置目录。
4. 使用临时目录内 ESLint 可执行文件的绝对路径、配置绝对路径和相对目标路径。
5. 未检测到可用的 `node` 或 `npx`、未实际执行 Lint 时返回退出码 1。
6. 输出明确说明当前是未执行的降级路径，不能将其解释为检查通过。

### 路径回归测试

- 从其他 cwd 对绝对路径的非法文件执行，返回 1 并包含预期规则错误。
- 从其他 cwd 对绝对路径的合法文件执行，返回 0 且不包含 `File ignored`。
- 从其他 cwd 对绝对目录执行，实际扫描目录中的目标。
- 多个目标位于不同子目录时均被扫描。
- 以连字符开头的文件仍可通过 `--` 正常检查。
- fallback 输出命令被实际执行，非法目标能够产生预期诊断。
- 无 `npx` 的降级路径返回非零。

## no-implied-eval 修复设计

涉及文件：

- `components/skills/typescript-code-rules/scripts/rule-index.json`
- `components/skills/typescript-code-rules/references/control-flow.md`
- `tests/typescript-code-rules.test.mjs`
- `tests/typescript-code-rules-examples.test.mjs`

将核心 `no-implied-eval` 替换为 `@typescript-eslint/no-implied-eval`，保持 `[强制]` 和 `error` 级别不变。同步文档中的规则名称和 JSON 配置，保留独立的 `no-new-func` 规则。

真实 Lint 测试必须证明以下代码触发 `@typescript-eslint/no-implied-eval`：

```ts
setTimeout('refresh()', 100);
setInterval('refresh()', 100);
window.setTimeout('refresh()', 100);
```

以下函数形式不得被该规则误报：

```ts
setTimeout(() => refresh(), 100);
```

## bad 示例与 fixture 测试设计

涉及文件：

- `tests/typescript-code-rules.test.mjs`
- `tests/typescript-code-rules-examples.test.mjs`

### 系统性 bad 示例验证

为每个具有 `eslintRule` 的规则提取对应 bad 示例，并要求输出中至少存在一条该规则的诊断。仅出现解析错误或其他规则诊断不算通过。

示例所需的外部声明沿用现有 good 示例的上下文机制。测试应明确报告未命中规则的示例文件和预期规则，避免只给出笼统失败。

### 现有非法 fixture

对 `tests/fixtures/typescript-code-rules/invalid.ts` 执行真实 Lint，断言：

- 退出码为 1。
- 输出包含 `no-var`、`eqeqeq`、`@typescript-eslint/no-unsafe-assignment`、`@typescript-eslint/no-unsafe-member-access` 和 `@typescript-eslint/restrict-plus-operands`。
- 不包含执行错误或文件被忽略的信息。

## 非空断言示例修复

涉及文件：`components/skills/typescript-code-rules/references/assertions.md`。

在 `non-nullable-type-assertion-style` 的 good/bad 示例中，将 `maybe` 显式声明为 `string | undefined`：

```ts
const maybe: string | undefined = Math.random() > 0.5 ? '' : undefined;
```

验收时，bad 示例中的 `maybe as string` 必须触发 `@typescript-eslint/non-nullable-type-assertion-style`；good 示例继续通过现有真实 Lint 测试，且不新增 `no-inferrable-types` 诊断。

## 异步风格文档修复

涉及文件：`components/skills/typescript-code-rules/references/async.md`。

保留“简单的一次性转换可直接返回 Promise”的原则。将当前简单 `.then()` bad 示例替换为包含顺序依赖、条件分支和错误处理的多层 Promise 链，使 bad 示例表达复杂流程应优先使用 `async/await`，不再与正文冲突。

不改变该规则的 `style` 级别，也不增加新的自动 lint 映射。

## 命名规则边界设计

涉及文件：

- `components/skills/typescript-code-rules/scripts/generate-eslint-config.mjs`
- `components/skills/typescript-code-rules/references/naming.md`
- `tests/typescript-code-rules-examples.test.mjs`

在现有命名规则上做两项最小例外：

1. 对必须带引号的属性使用 `modifiers: ['requiresQuotes']` 和 `format: null`，允许 `'Content-Type'` 等外部协议字段。
2. 仅为双前导下划线的元数据属性增加精确豁免，允许 `__typename`，但不放开普通单前导下划线或其他任意属性格式。

文档说明这些例外用于外部协议和元数据，不是普通业务命名的推荐形式。good 示例加入允许场景，bad 示例继续证明普通违规命名会被捕获。

## 文件变更范围

预期仅修改：

- `components/skills/typescript-code-rules/scripts/lint.mjs`
- `components/skills/typescript-code-rules/scripts/generate-eslint-config.mjs`
- `components/skills/typescript-code-rules/scripts/rule-index.json`
- `components/skills/typescript-code-rules/references/control-flow.md`
- `components/skills/typescript-code-rules/references/assertions.md`
- `components/skills/typescript-code-rules/references/async.md`
- `components/skills/typescript-code-rules/references/naming.md`
- `tests/typescript-code-rules.test.mjs`
- `tests/typescript-code-rules-examples.test.mjs`
- 构建命令重新生成的对应 `dist` 产物

如果实现中发现必须修改其他文件，应先确认它与上述缺陷直接相关。

## 实施顺序

1. 添加跨目录、绝对目录、fallback 和 ignored 假绿测试并验证失败。
2. 修复 `lint.mjs`，使路径和退出码测试通过。
3. 添加 `no-implied-eval` 和系统性 bad 示例测试并验证漏检。
4. 替换规则并修正非空断言示例。
5. 添加命名例外测试并验证失败，再调整配置和文档。
6. 修正异步风格 bad 示例。
7. 运行专项测试和全仓验证，检查构建产物与工作区状态。

## 最终验收

以下命令必须全部通过：

```bash
node --test tests/typescript-code-rules.test.mjs tests/typescript-code-rules-examples.test.mjs
pnpm test
pnpm validate
pnpm build
```

还需完成真实端到端验证：

- 相对路径、绝对文件、绝对目录和多目标均实际扫描。
- 从目标项目之外的 cwd 调用仍实际扫描。
- 合法文件返回 0，非法文件返回 1。
- 依赖不可用、执行失败或目标因 base path 被忽略时不得返回成功；合法空目录等无匹配文件的场景按 ESLint 自身语义处理。
- fallback 命令实际可运行，未执行 Lint 的降级路径返回非零。
- 所有可自动化 bad 示例均被对应规则捕获。
- 构建后的组件压缩包和各宿主投影包含相同修复。
- `git status` 中没有构建或测试产生的无关文件。
