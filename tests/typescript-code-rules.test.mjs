import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import test from 'node:test';
import {
  buildEslintConfig,
  buildEslintRules,
  loadRuleIndex,
} from '../components/skills/typescript-code-rules/scripts/generate-eslint-config.mjs';

const componentRoot = resolve('components/skills/typescript-code-rules');
const reviewScript = resolve(componentRoot, 'scripts/review-checklist.mjs');

test('rule ids are unique and metadata uses supported levels', () => {
  const rules = loadRuleIndex();
  const ids = rules.map((rule) => rule.id);
  assert.equal(new Set(ids).size, ids.length);

  for (const rule of rules) {
    assert.ok(['error', 'warn', 'style'].includes(rule.level), rule.id);
    assert.ok(rule.title.trim().length > 0, rule.id);
    if (rule.level === 'style') {
      assert.equal(rule.eslintRule, null, rule.id);
    } else {
      assert.equal(typeof rule.eslintRule, 'string', rule.id);
    }
  }
});

test('every rule points to an existing reference file', () => {
  for (const rule of loadRuleIndex()) {
    assert.ok(existsSync(resolve(componentRoot, rule.reference)), `${rule.id}: ${rule.reference}`);
  }
});

test('core ESLint rules are preserved and style rules are excluded', () => {
  const eslintRules = buildEslintRules(loadRuleIndex());
  assert.equal(eslintRules['no-var'], 'error');
  assert.equal(eslintRules['prefer-const'], 'error');
  assert.deepEqual(eslintRules.eqeqeq, ['error', 'always']);

  for (const rule of loadRuleIndex()) {
    if (rule.level === 'style') {
      assert.equal(Object.hasOwn(eslintRules, rule.id), false, rule.id);
    }
  }
});

test('review checklist includes the modernized categories', () => {
  const result = spawnSync(process.execPath, [reviewScript], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /变量与函数（variables-functions）/);
  assert.match(result.stdout, /风格与注释（style）/);
  assert.match(result.stdout, /浏览器环境（browser）/);
});

test('generated config keeps type-aware TypeScript linting enabled', () => {
  const config = buildEslintConfig(loadRuleIndex());
  assert.match(config, /files: \['\*\*\/\*\.ts', '\*\*\/\*\.tsx'\]/);
  assert.match(config, /projectService: true/);
  assert.match(config, /sourceType: 'module'/);
});

test('generated config supports explicit npx dependency imports', () => {
  const config = buildEslintConfig(loadRuleIndex(), {
    parserImport: 'file:///tmp/npx/node_modules/@typescript-eslint/parser/dist/index.js',
    pluginImport: 'file:///tmp/npx/node_modules/@typescript-eslint/eslint-plugin/dist/index.js',
  });
  assert.match(config, /import tsParser from "file:\/\/\/tmp\/npx\/node_modules\/@typescript-eslint\/parser\/dist\/index.js"/);
  assert.match(config, /import tsPlugin from "file:\/\/\/tmp\/npx\/node_modules\/@typescript-eslint\/eslint-plugin\/dist\/index.js"/);
});

test('restrict-plus-operands uses current option names', () => {
  const eslintRules = buildEslintRules(loadRuleIndex());
  const options = eslintRules['@typescript-eslint/restrict-plus-operands'][1];
  assert.equal(options.skipCompoundAssignments, false);
  assert.equal(options.allowAny, false);
  assert.equal(options.allowBoolean, false);
  assert.equal(options.allowNullish, false);
  assert.equal(options.allowNumberAndString, false);
  assert.equal(options.allowRegExp, false);
  assert.equal(Object.hasOwn(options, 'checkCompoundAssignments'), false);
});

test('skill entry routes all categories without hard-coded rule counts', () => {
  const skill = readFileSync(resolve(componentRoot, 'SKILL.md'), 'utf8');
  const readme = readFileSync(resolve(componentRoot, 'README.md'), 'utf8');
  for (const reference of ['variables-functions.md', 'style.md', 'browser.md']) {
    assert.ok(skill.includes(reference), reference);
    assert.ok(readme.includes(reference), reference);
  }
  assert.doesNotMatch(skill, /87 条/);
  assert.doesNotMatch(readme, /87 条/);
});

test('reference headings match rule index titles and levels', () => {
  const labels = { error: '强制', warn: '推荐', style: '规范' };
  for (const rule of loadRuleIndex()) {
    const reference = readFileSync(resolve(componentRoot, rule.reference), 'utf8');
    const title = rule.title.split('（')[0];
    const heading = `### [${labels[rule.level]}] ${title}`;
    assert.ok(reference.includes(heading), `${rule.id}: missing ${heading}`);
  }
});

test('no-npx fallback prints a runnable command with quoted paths', { skip: process.platform === 'win32' }, () => {
  const directory = mkdtempSync(join(tmpdir(), 'ts-code-rules-fallback-'));
  try {
    symlinkSync(process.execPath, join(directory, 'node'));
    const target = join(directory, 'file with spaces.ts');
    writeFileSync(target, 'export const value = 1;\n');
    const result = spawnSync(process.execPath, [
      resolve(componentRoot, 'scripts/lint.mjs'),
      target,
    ], {
      encoding: 'utf8',
      env: { ...process.env, PATH: directory },
    });

    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout, /未执行/);
    assert.match(result.stdout, /npm --prefix/);
    assert.match(result.stdout, /npm --prefix .* install --no-save eslint@9\.39\.5 typescript@5\.9\.3 @typescript-eslint\/parser@8\.72\.1 @typescript-eslint\/eslint-plugin@8\.72\.1/);
    assert.ok(result.stdout.includes(`cd '${directory}'`), result.stdout);
    assert.ok(result.stdout.includes(`'${basename(target)}'`), result.stdout);
    assert.match(result.stdout, /node .*node_modules\/eslint\/bin\/eslint\.js/);
    assert.doesNotMatch(result.stdout, /\.\/node_modules\/\.bin\/eslint/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

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

    const directoryResult = spawnSync(process.execPath, [
      lintScript,
      resolve('tests/fixtures/typescript-code-rules'),
    ], { cwd: directory, encoding: 'utf8' });
    assert.equal(directoryResult.status, 1, directoryResult.stdout + directoryResult.stderr);
    assert.match(directoryResult.stdout, /invalid\.ts/);
    assert.match(directoryResult.stdout, /no-var/);

    const multiResult = spawnSync(process.execPath, [lintScript, valid, invalid], {
      cwd: directory,
      encoding: 'utf8',
    });
    assert.equal(multiResult.status, 1, multiResult.stdout + multiResult.stderr);
    assert.match(multiResult.stdout, /invalid\.ts/);
    assert.match(multiResult.stdout, /restrict-plus-operands/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('deprecated prefer-ts-expect-error is not duplicated in the rule set', () => {
  const rules = loadRuleIndex();
  assert.equal(rules.some((rule) => rule.id === 'prefer-ts-expect-error'), false);
  const assertions = readFileSync(resolve(componentRoot, 'references/assertions.md'), 'utf8');
  assert.doesNotMatch(assertions, /### .*使用 @ts-expect-error 替代 @ts-ignore/);
});

test('review checklist rejects missing values and unknown options', () => {
  for (const args of [['--level'], ['--category'], ['--unknown']]) {
    const result = spawnSync(process.execPath, [reviewScript, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 1, args.join(' '));
    assert.match(result.stderr, /错误:/);
  }
});

test('config generator rejects unknown options', () => {
  const result = spawnSync(process.execPath, [
    resolve(componentRoot, 'scripts/generate-eslint-config.mjs'),
    '--unknown',
  ], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /错误:/);
});

test('lint rejects unknown options and preserves targets after --', { skip: process.platform === 'win32' }, () => {
  const directory = mkdtempSync(join(tmpdir(), 'ts-code-rules-args-'));
  try {
    symlinkSync(process.execPath, join(directory, 'node'));
    const target = join(directory, '-fixture.ts');
    writeFileSync(target, 'export const value = 1;\n');
    const lintScript = resolve(componentRoot, 'scripts/lint.mjs');
    const env = { ...process.env, PATH: directory };

    const unknown = spawnSync(process.execPath, [lintScript, '--unknown'], { encoding: 'utf8', env });
    assert.equal(unknown.status, 1);
    assert.match(unknown.stderr, /错误:/);

    const separated = spawnSync(process.execPath, [lintScript, '--', target], { encoding: 'utf8', env });
    assert.equal(separated.status, 1, separated.stderr);
    assert.ok(separated.stdout.includes(`'${basename(target)}'`), separated.stdout);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('lint forwards -- targets to ESLint and treats --help after -- as a file', () => {
  const directory = mkdtempSync(join(tmpdir(), 'ts-code-rules-normal-args-'));
  try {
    const target = join(directory, '-fixture.ts');
    const helpTarget = join(directory, '--help');
    writeFileSync(target, 'export const value = 1;\n');
    writeFileSync(helpTarget, 'export const help = 1;\n');
    writeFileSync(join(directory, 'tsconfig.json'), JSON.stringify({
      compilerOptions: { target: 'ES2022', module: 'ESNext', strict: true },
      include: ['*.ts'],
    }));
    const lintScript = resolve(componentRoot, 'scripts/lint.mjs');

    const dashed = spawnSync(process.execPath, [lintScript, '--', '-fixture.ts'], {
      cwd: directory,
      encoding: 'utf8',
    });
    assert.equal(dashed.status, 0, dashed.stdout + dashed.stderr);

    const help = spawnSync(process.execPath, [lintScript, '--', '--help'], {
      cwd: directory,
      encoding: 'utf8',
    });
    assert.equal(help.status, 0, help.stdout + help.stderr);
    assert.match(help.stdout, /临时配置:/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('type-aware no-implied-eval replaces the core rule', () => {
  const eslintRules = buildEslintRules(loadRuleIndex());
  assert.equal(eslintRules['@typescript-eslint/no-implied-eval'], 'error');
  assert.equal(Object.hasOwn(eslintRules, 'no-implied-eval'), false);
});

test('no-implied-eval catches string timers and allows function timers', () => {
  const directory = mkdtempSync(join(tmpdir(), 'ts-code-rules-implied-eval-'));
  try {
    writeFileSync(join(directory, 'bad.ts'), `setTimeout('refresh()', 100);\nsetInterval('refresh()', 100);\nwindow.setTimeout('refresh()', 100);\nfunction refresh() {}\nexport { refresh };\n`);
    writeFileSync(join(directory, 'good.ts'), `setTimeout(() => { refresh(); }, 100);\nfunction refresh() {}\nexport { refresh };\n`);
    writeFileSync(join(directory, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        strict: true,
        lib: ['ES2022', 'DOM'],
      },
      include: ['*.ts'],
    }));
    const lintScript = resolve(componentRoot, 'scripts/lint.mjs');

    const bad = spawnSync(process.execPath, [lintScript, 'bad.ts'], {
      cwd: directory,
      encoding: 'utf8',
    });
    assert.equal(bad.status, 1, bad.stdout + bad.stderr);
    assert.equal(bad.stdout.match(/@typescript-eslint\/no-implied-eval/g)?.length, 3, bad.stdout);

    const good = spawnSync(process.execPath, [lintScript, 'good.ts'], {
      cwd: directory,
      encoding: 'utf8',
    });
    assert.equal(good.status, 0, good.stdout + good.stderr);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('naming convention permits quoted protocol properties and dunder metadata only', () => {
  const options = buildEslintRules(loadRuleIndex())['@typescript-eslint/naming-convention'].slice(1);
  const quoted = options.find((option) => option.modifiers?.includes('requiresQuotes'));
  assert.equal(quoted.selector, 'property');
  assert.equal(quoted.format, null);
  const metadata = options.find((option) => option.filter === '^__');
  assert.equal(metadata.selector, 'property');
  assert.equal(metadata.format, null);
});

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
