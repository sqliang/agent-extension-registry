# typescript-code-rules Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 修复 typescript-code-rules 的 Lint 假绿、失效规则、无效示例和命名兼容性问题，并用真实 ESLint 执行防止回归。

**Architecture:** 保留现有规则索引、flat config 生成器和 `lint.mjs` 命令行结构。Lint 执行器根据所有目标计算公共执行根目录，再使用相对目标运行 ESLint；规则修复继续由 `rule-index.json` 和 `RULE_OPTIONS` 单一事实源驱动。

**Tech Stack:** Node.js >=20、Node test runner、ESLint 9.39.5、TypeScript 5.9.3、@typescript-eslint 8.72.1、pnpm。

## Global Constraints

- 设计依据：`docs/superpowers/specs/2026-11-16-typescript-code-rules-fixes-design.md`。
- 保留工作区已有修改，不回退或覆盖无关改动。
- 沿用组件版本 `1.1.0`，不额外修改版本号。
- 不引入新依赖，不重写为 ESLint Node API。
- 不放开普通 `_privateProperty`、任意 snake_case 或任意首尾下划线。
- 不执行 git commit 或 push。
- 每项行为修改先写失败测试并确认失败原因，再写最小实现。
- 最终必须通过专项测试、`pnpm test`、`pnpm validate` 和 `pnpm build`。

---

### Task 1: 修复 Lint 跨目录路径和 fallback 假绿

**Files:**
- Modify: `components/skills/typescript-code-rules/scripts/lint.mjs`
- Modify: `tests/typescript-code-rules.test.mjs`
- Uses: `tests/fixtures/typescript-code-rules/valid.ts`
- Uses: `tests/fixtures/typescript-code-rules/invalid.ts`

**Interfaces:**
- Consumes: 现有 `writeTempConfig(dependencyImports)`、`buildEslintConfig()` 和固定 `LINT_PACKAGES`。
- Produces: `resolveExecution(targets)`，返回 `{ root: string, targets: string[] }`；`main()` 的正常和 fallback 路径共同消费该结果。

- [x] **Step 1: 添加绝对文件、绝对目录和多目标失败测试**

在 `tests/typescript-code-rules.test.mjs` 添加真实集成测试。核心断言如下，测试临时目录使用现有 `mkdtempSync`/`rmSync` 模式：

```js
test('lint scans absolute targets outside the invocation cwd', () => {
  const directory = mkdtempSync(join(tmpdir(), 'ts-code-rules-absolute-'));
  try {
    const lintScript = resolve(componentRoot, 'scripts/lint.mjs');
    const invalid = resolve('tests/fixtures/typescript-code-rules/invalid.ts');
    const valid = resolve('tests/fixtures/typescript-code-rules/valid.ts');

    const invalidResult = spawnSync(process.execPath, [lintScript, invalid], {
      cwd: directory,
      encoding: 'utf8',
    });
    assert.equal(invalidResult.status, 1, invalidResult.stdout + invalidResult.stderr);
    assert.match(invalidResult.stdout, /@typescript-eslint\/no-unsafe-member-access/);
    assert.doesNotMatch(invalidResult.stdout, /File ignored|outside of base path/);

    const validResult = spawnSync(process.execPath, [lintScript, valid], {
      cwd: directory,
      encoding: 'utf8',
    });
    assert.equal(validResult.status, 0, validResult.stdout + validResult.stderr);
    assert.doesNotMatch(validResult.stdout, /File ignored|outside of base path/);

    const directoryResult = spawnSync(process.execPath, [lintScript, resolve('tests/fixtures/typescript-code-rules')], {
      cwd: directory,
      encoding: 'utf8',
    });
    assert.equal(directoryResult.status, 1, directoryResult.stdout + directoryResult.stderr);
    assert.match(directoryResult.stdout, /invalid\.ts/);
    assert.match(directoryResult.stdout, /no-var/);

    const multiResult = spawnSync(process.execPath, [lintScript, valid, invalid], {
      cwd: directory,
      encoding: 'utf8',
    });
    assert.equal(multiResult.status, 1, multiResult.stdout + multiResult.stderr);
    assert.match(multiResult.stdout, /valid\.ts|invalid\.ts/);
    assert.match(multiResult.stdout, /restrict-plus-operands/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
```

将现有 no-npx fallback 测试的成功断言改为执行失败语义，并检查命令不再要求进入配置目录执行 Lint：

```js
assert.equal(result.status, 1);
assert.match(result.stdout, /未执行|无法自动执行 ESLint/);
assert.match(result.stdout, /npm --prefix/);
assert.doesNotMatch(result.stdout, /cd .*ts-code-rules-lint-.*\n\s+node node_modules/);
```

- [x] **Step 2: 运行测试并确认 RED**

Run:

```bash
node --test --test-name-pattern='absolute targets|no-npx fallback' tests/typescript-code-rules.test.mjs
```

Expected: 绝对文件用例出现 `File ignored` 或状态不符合预期，绝对目录用例退出 2；fallback 用例因当前返回 0 且使用 `cd <配置目录>` 而失败。

- [x] **Step 3: 实现公共执行根目录**

在 `lint.mjs` 增加以下辅助函数：

```js
function isWithinDirectory(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function resolveExecution(targets) {
  const absoluteTargets = targets.map((target) => path.resolve(target));
  const directories = absoluteTargets.map((target) =>
    fs.statSync(target).isDirectory() ? target : path.dirname(target)
  );

  let root = directories[0];
  while (!directories.every((directory) => isWithinDirectory(root, directory))) {
    const parent = path.dirname(root);
    if (parent === root) {
      throw new Error(`目标没有可用的公共执行目录: ${absoluteTargets.join(', ')}`);
    }
    root = parent;
  }

  return {
    root,
    targets: absoluteTargets.map((target) => path.relative(root, target) || '.'),
  };
}
```

在通过目标存在性检查之后、检测命令之前计算执行上下文：

```js
let execution;
try {
  execution = resolveExecution(targets);
} catch (error) {
  console.error(`错误: ${error.message}`);
  process.exit(1);
}
```

- [x] **Step 4: 正常路径使用执行根目录和相对目标**

将 `npxArgs` 中的目标改为 `execution.targets`，并为同步进程设置 cwd：

```js
const npxArgs = [
  '--yes',
  ...NPX_PACKAGE_ARGS,
  'eslint',
  '--config', configPath,
  '--',
  ...execution.targets,
];

console.log(`执行: npx ${npxArgs.join(' ')}`);
const result = spawnSync('npx', npxArgs, { stdio: 'inherit', cwd: execution.root });
```

- [x] **Step 5: 修复 fallback 命令和退出码**

fallback 保留临时配置供用户执行，但依赖安装与 Lint 工作目录分离：

```js
const configDirectory = path.dirname(configPath);
console.log('降级提示: 未检测到可用的 node/npx，未执行 ESLint。');
console.log(`规则配置已生成到: ${configPath}`);
console.log('请执行以下命令安装依赖并运行检查:');
console.log('');
console.log(`  npm --prefix ${quoteShellArgument(configDirectory)} install --no-save ${LINT_PACKAGES.join(' ')}`);
console.log(`  cd ${quoteShellArgument(execution.root)}`);
console.log(
  `  node ${quoteShellArgument(path.join(configDirectory, 'node_modules', 'eslint', 'bin', 'eslint.js'))} --config ${quoteShellArgument(configPath)} -- ${execution.targets
    .map(quoteShellArgument)
    .join(' ')}`
);
process.exit(1);
```

同步 `USAGE`，说明目标可以是相对或绝对路径，未执行检查的降级路径返回非零。

- [x] **Step 6: 运行专项测试并确认 GREEN**

Run:

```bash
node --test tests/typescript-code-rules.test.mjs
```

Expected: 所有测试通过；绝对文件、绝对目录和多目标输出不含 base path 忽略警告。

- [x] **Step 7: 实际执行一次 fallback 输出命令**

先用仅包含 `node` 的临时 PATH 生成 fallback 命令，再恢复正常 PATH，依次执行输出的 `npm --prefix ... install`、`cd <执行根目录>` 和 `node <配置目录>/node_modules/eslint/bin/eslint.js ...`。

Expected: 对 `invalid.ts` 返回 1 并显示规则错误；对 `valid.ts` 返回 0；两种情况均无 `File ignored`。

### Task 2: 修复 no-implied-eval 并建立 bad 示例反向验证

**Files:**
- Modify: `components/skills/typescript-code-rules/scripts/rule-index.json`
- Modify: `components/skills/typescript-code-rules/references/control-flow.md`
- Modify: `tests/typescript-code-rules.test.mjs`
- Modify: `tests/typescript-code-rules-examples.test.mjs`

**Interfaces:**
- Consumes: `buildEslintRules(loadRuleIndex())` 和现有 `externalContexts`。
- Produces: `@typescript-eslint/no-implied-eval: 'error'`；可复用的 Markdown 规则块收集逻辑，将每个 bad 示例映射到其标题对应的规则。

- [x] **Step 1: 添加规则映射和真实隐式执行失败测试**

在 `tests/typescript-code-rules.test.mjs` 添加：

```js
test('type-aware no-implied-eval replaces the core rule', () => {
  const eslintRules = buildEslintRules(loadRuleIndex());
  assert.equal(eslintRules['@typescript-eslint/no-implied-eval'], 'error');
  assert.equal(Object.hasOwn(eslintRules, 'no-implied-eval'), false);
});
```

在示例测试中增加 bad 示例收集：按 Markdown 标题匹配 `rule-index.json` 的标题与级别，跳过 `eslintRule: null`，将 bad 块写入临时目录，并复用其前一个 good 块登记的外部上下文。每个 bad 文件记录预期的完整 `eslintRule`。运行真实 Lint 后按文件段落断言：

```js
assert.ok(
  diagnostics.includes(expectedRule),
  `${filename}: expected ${expectedRule}, got:\n${diagnostics || '(no diagnostics)'}`,
);
```

同时增加一个最小真实 fixture，包含：

```ts
setTimeout('refresh()', 100);
setInterval('refresh()', 100);
window.setTimeout('refresh()', 100);
function refresh() {}
export { refresh };
```

断言三种调用均出现 `@typescript-eslint/no-implied-eval`。另用 `setTimeout(() => refresh(), 100)` 验证函数形式不误报。

- [x] **Step 2: 运行测试并确认 RED**

Run:

```bash
node --test --test-name-pattern='no-implied-eval|bad examples' tests/typescript-code-rules.test.mjs tests/typescript-code-rules-examples.test.mjs
```

Expected: 当前核心规则映射断言失败；字符串定时器没有 `@typescript-eslint/no-implied-eval` 诊断；bad 示例审计至少报告 `control-flow.md` 的隐式执行示例未命中。

- [x] **Step 3: 替换为类型感知扩展规则**

将 `rule-index.json` 中对应条目改为：

```json
{"id": "no-implied-eval", "eslintRule": "@typescript-eslint/no-implied-eval", "level": "error", "category": "control-flow", "title": "禁止通过字符串隐式执行代码", "reference": "references/control-flow.md"}
```

同步 `references/control-flow.md` 的规则链接与配置：

```md
ESLint: `@typescript-eslint/no-implied-eval` · [官方文档](https://typescript-eslint.io/rules/no-implied-eval/)
```

```json
{ "@typescript-eslint/no-implied-eval": "error" }
```

- [x] **Step 4: 运行测试并确认 GREEN**

Run:

```bash
node --test --test-name-pattern='no-implied-eval|bad examples' tests/typescript-code-rules.test.mjs tests/typescript-code-rules-examples.test.mjs
```

Expected: 隐式执行测试通过；bad 示例审计不再报告 `no-implied-eval`，只允许后续 Task 3 明确处理的非空断言论例保持 RED。

### Task 3: 修复非空断言示例和异步风格矛盾

**Files:**
- Modify: `components/skills/typescript-code-rules/references/assertions.md`
- Modify: `components/skills/typescript-code-rules/references/async.md`
- Test: `tests/typescript-code-rules-examples.test.mjs`

**Interfaces:**
- Consumes: Task 2 的系统性 bad 示例验证和现有 good 示例真实 Lint。
- Produces: 可被 `non-nullable-type-assertion-style` 实际捕获的 bad 示例；与正文一致的异步风格示例。

- [x] **Step 1: 确认非空断言 bad 示例测试仍为 RED**

Run:

```bash
node --test --test-name-pattern='bad examples' tests/typescript-code-rules-examples.test.mjs
```

Expected: `assertions.md` 的 `non-nullable-type-assertion-style` bad 示例未命中目标规则。

- [x] **Step 2: 修正非空断言示例**

将该规则的 good 和 bad 两个示例中的 `maybe` 都改为：

```ts
const maybe: string | undefined = Math.random() > 0.5 ? '' : undefined;
```

保留 good 中的 `maybe!` 和 bad 中的 `maybe as string`、`<string>maybe`，以分别验证非空断言语义和类型断言风格。

- [x] **Step 3: 将异步 bad 示例改为复杂 Promise 链**

保留正文“简单的一次性转换可直接返回 Promise”。将 bad 示例替换为包含分支、错误处理和顺序依赖的链式代码：

```ts
// bad
function loadReport(id: string) {
  return fetchReport(id)
    .then(report => {
      if (!validateReport(report)) {
        return Promise.reject(new Error('Invalid report'));
      }
      return report;
    })
    .then(report => validateReport(report))
    .catch(() => false);
}
```

good 的 `async/await` 示例增加对应的非法报告分支，使两者表达同一业务语义：

```ts
// good
async function loadReport(id: string) {
  try {
    const report = await fetchReport(id);
    if (!validateReport(report)) {
      throw new Error('Invalid report');
    }
    return validateReport(report);
  } catch {
    return false;
  }
}
```

- [x] **Step 4: 运行示例测试并确认 GREEN**

Run:

```bash
node --test tests/typescript-code-rules-examples.test.mjs
```

Expected: good 示例仍只有已登记的 `no-non-null-assertion` warning；所有可自动化 bad 示例命中各自规则。

### Task 4: 为外部协议属性增加有限命名例外

**Files:**
- Modify: `components/skills/typescript-code-rules/scripts/generate-eslint-config.mjs`
- Modify: `components/skills/typescript-code-rules/references/naming.md`
- Modify: `tests/typescript-code-rules.test.mjs`
- Modify: `tests/typescript-code-rules-examples.test.mjs`

**Interfaces:**
- Consumes: 现有 `RULE_OPTIONS['naming-convention']`。
- Produces: 带引号属性的 `modifiers: ['requiresQuotes'], format: null`，以及仅匹配双前导下划线元数据属性的 `format: null` 豁免。

- [x] **Step 1: 添加命名允许与拒绝场景**

在 `references/naming.md` 的 good 示例中加入：

```ts
interface GraphQLResult {
  __typename: string;
}

const headers = {
  'Content-Type': 'application/json',
};
```

在 bad 示例中加入普通单下划线属性：

```ts
interface InternalState {
  _cached: boolean;
}
```

在 `tests/typescript-code-rules.test.mjs` 添加配置结构断言：

```js
test('naming convention permits quoted protocol properties and dunder metadata only', () => {
  const options = buildEslintRules(loadRuleIndex())['@typescript-eslint/naming-convention'].slice(1);
  const quoted = options.find((option) => option.modifiers?.includes('requiresQuotes'));
  assert.equal(quoted.selector, 'property');
  assert.equal(quoted.format, null);
  const metadata = options.find((option) => option.filter === '^__');
  assert.equal(metadata.selector, 'property');
  assert.equal(metadata.format, null);
});
```

- [x] **Step 2: 运行命名测试并确认 RED**

Run:

```bash
node --test --test-name-pattern='naming convention|good examples|bad examples' tests/typescript-code-rules.test.mjs tests/typescript-code-rules-examples.test.mjs
```

Expected: 配置结构断言失败；`__typename` 和 `'Content-Type'` 当前产生命名错误；`_cached` 继续报错。

- [x] **Step 3: 添加最小命名配置例外**

在 `RULE_OPTIONS['naming-convention']` 中增加必须带引号的属性选择器：

```js
{ selector: 'property', modifiers: ['requiresQuotes'], format: null },
```

增加独立、精确的元数据属性选择器：

```js
{ selector: 'property', filter: '^__', format: null },
```

在文档 JSON 中同步相同配置，并说明：带引号属性用于外部协议，双前导下划线用于元数据；普通业务属性仍使用 camelCase，单前导下划线仍禁止。

- [x] **Step 4: 运行命名和完整示例测试并确认 GREEN**

Run:

```bash
node --test tests/typescript-code-rules.test.mjs tests/typescript-code-rules-examples.test.mjs
```

Expected: 所有专项测试通过；允许场景不再误报，`_cached` 仍被 `naming-convention` 捕获。

### Task 5: 使用非法 fixture 并执行全仓验收

**Files:**
- Modify: `tests/typescript-code-rules.test.mjs`
- Regenerate: `dist/components/typescript-code-rules/1.1.0/*`
- Regenerate: `dist/projections/plugin/typescript-code-rules/1.0.0/*`
- Check: `dist/catalog.json`

**Interfaces:**
- Consumes: Tasks 1-4 的实现与测试。
- Produces: 可发布的一致组件压缩包、目录和各宿主投影。

- [x] **Step 1: 为现有 invalid fixture 添加真实 Lint 测试**

```js
test('invalid fixture fails with the expected rules', () => {
  const result = spawnSync(process.execPath, [
    resolve(componentRoot, 'scripts/lint.mjs'),
    resolve('tests/fixtures/typescript-code-rules/invalid.ts'),
  ], { encoding: 'utf8' });

  assert.equal(result.status, 1, result.stdout + result.stderr);
  for (const rule of [
    'no-var',
    'eqeqeq',
    '@typescript-eslint/no-unsafe-assignment',
    '@typescript-eslint/no-unsafe-member-access',
    '@typescript-eslint/restrict-plus-operands',
  ]) {
    assert.ok(result.stdout.includes(rule), rule);
  }
  assert.doesNotMatch(result.stdout, /File ignored|Something went wrong/);
});
```

- [x] **Step 2: 运行全部专项测试**

Run:

```bash
node --test tests/typescript-code-rules.test.mjs tests/typescript-code-rules-examples.test.mjs
```

Expected: 全部通过，无 ignored、执行错误或意外 warning。

- [x] **Step 3: 运行全仓测试和结构校验**

Run:

```bash
pnpm test
pnpm validate
```

Expected: 所有测试通过；仓库清单和脚本校验通过。

- [x] **Step 4: 构建并验证发布产物**

Run:

```bash
pnpm build
```

Expected: `tsc`、CLI 构建、组件压缩包和全部 host bundle 校验通过。

- [x] **Step 5: 检查工作区和产物一致性**

Run:

```bash
git status --short
git diff --check
git diff -- components/skills/typescript-code-rules tests/typescript-code-rules.test.mjs tests/typescript-code-rules-examples.test.mjs
```

Expected: 没有空白错误；变更仅限本计划、已批准设计及对应构建产物，没有测试日志或临时文件进入仓库。保留所有既有无关修改，不做清理或回退。
