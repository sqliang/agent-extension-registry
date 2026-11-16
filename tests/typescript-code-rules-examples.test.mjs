import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const componentRoot = resolve('components/skills/typescript-code-rules');
const referencesRoot = resolve(componentRoot, 'references');
const externalContexts = new Map([
  ['arrays-objects.md#8', { before: 'declare const items: string[];\n' }],
  ['arrays-objects.md#12', {
    before: `class Component {
  state = { clicked: false };
  setState(updater: (state: { clicked: boolean }) => { clicked: boolean }) {
    this.state = updater(this.state);
  }
  update() {
`,
    after: '}\n}\n',
  }],
  ['arrays-objects.md#18', { before: 'declare function getKey(): string;\n' }],
  ['async.md#4', {
    before: 'declare function hasMore(): Promise<boolean>;\ndeclare function processNext(): Promise<void>;\n',
  }],
  ['async.md#6', {
    before: 'declare const promise: Promise<string>;\ndeclare const somethingToDo: boolean;\ndeclare const cond: boolean;\n',
  }],
  ['async.md#10', {
    before: 'declare function fetchReport(id: string): Promise<unknown>;\ndeclare function validateReport(report: unknown): boolean;\n',
  }],
  ['async.md#12', {
    before: `declare function requestTags(): Promise<string[]>;
declare function requestArticles(): Promise<string[]>;
declare function requestPrimaryMirror(): Promise<string>;
declare function requestSecondaryMirror(): Promise<string>;
`,
  }],
  ['browser.md#2', { before: 'declare const panel: HTMLElement;\ndeclare const isOpen: boolean;\n' }],
  ['browser.md#4', {
    before: 'declare const button: HTMLButtonElement;\ndeclare function handleClick(event: MouseEvent): void;\n',
  }],
  ['browser.md#6', {
    before: 'declare const items: Array<{ label: string }>;\ndeclare const list: HTMLUListElement;\n',
  }],
  ['browser.md#8', {
    before: 'declare const userInput: string;\ndeclare const container: HTMLElement;\n',
  }],
  ['classes.md#8', { before: 'declare const process: { env: Record<string, string> };\n' }],
  ['control-flow.md#16', {
    before: 'class Worker {\n  doWork(): void {}\n  run() {\n',
    after: '}\n}\n',
  }],
  ['control-flow.md#20', { before: 'declare const obj: Record<string, unknown>;\n' }],
  ['control-flow.md#24', { before: 'declare const ready: boolean;\ndeclare function start(): void;\n' }],
  ['control-flow.md#28', { before: 'declare const input: string;\n' }],
  ['control-flow.md#30', { before: 'declare function refresh(): void;\n' }],
  ['control-flow.md#34', { before: 'declare const point: { x: number; y: number };\n' }],
  ['modules.md#14', {
    files: {
      'date.ts': 'export function formatDate(date: Date): string {\n  return date.toISOString();\n}\n',
    },
  }],
  ['style.md#1', {
    before: `interface WorkflowInput { value: string }
interface WorkflowOptions { value: string }
interface WorkflowResult { value: string }
declare function readInput(): WorkflowInput;
declare function parseOptions(input: WorkflowInput): WorkflowOptions;
declare function execute(options: WorkflowOptions): WorkflowResult;
`,
  }],
  ['style.md#2', { before: 'declare function createRequestId(): string;\n' }],
  ['types.md#16', { before: 'declare class MyMap<K, V> extends Map<K, V> {}\n' }],
  ['variables-functions.md#4', { before: 'interface User { active: boolean; name: string }\n' }],
  ['variables-functions.md#10', {
    before: 'declare const user: { firstName: string; lastName: string };\ndeclare const colors: string[];\n',
  }],
  ['variables-functions.md#14', { before: 'declare const element: HTMLElement;\n' }],
  ['variables-functions.md#16', {
    before: `interface ViewState { selected: boolean; available: boolean }
declare function syncSelection(state: ViewState): void;
declare function syncAvailability(state: ViewState): void;
`,
  }],
]);

test('all good examples pass the real rule set with declared external contexts', () => {
  const directory = mkdtempSync(join(tmpdir(), 'ts-code-rules-examples-'));
  try {
    const usedExternalBlocks = new Set();
    let exampleCount = 0;
    for (const name of readdirSync(referencesRoot).filter((name) => name.endsWith('.md'))) {
      const markdown = readFileSync(join(referencesRoot, name), 'utf8');
      const blocks = [...markdown.matchAll(/```ts\n([\s\S]*?)```/g)];
      blocks.forEach((match, index) => {
        const code = match[1];
        if (!code.startsWith('// good')) return;
        const key = `${name}#${index}`;
        const context = externalContexts.get(key);
        if (context) {
          usedExternalBlocks.add(key);
          for (const [file, contents] of Object.entries(context.files ?? {})) {
            writeFileSync(join(directory, file), contents);
          }
        }
        const contents = `${context?.before ?? ''}${code}${context?.after ?? ''}`;
        const moduleContents = /^\s*(?:import|export)\b/m.test(contents)
          ? contents
          : `${contents}\nexport {};\n`;
        writeFileSync(join(directory, `${name}-${index}.ts`), moduleContents);
        exampleCount++;
      });
    }

    assert.equal(exampleCount, 120);
    assert.deepEqual(usedExternalBlocks, new Set(externalContexts.keys()));
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

    const result = spawnSync(process.execPath, [
      resolve(componentRoot, 'scripts/lint.mjs'),
      '.',
    ], { cwd: directory, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const warningLines = result.stdout.match(/^\s*\d+:\d+\s+warning\s+.*$/gm) ?? [];
    assert.equal(warningLines.length, 1, result.stdout);
    assert.match(warningLines[0], /@typescript-eslint\/no-non-null-assertion/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('all bad examples trigger their mapped rules', () => {
  const directory = mkdtempSync(join(tmpdir(), 'ts-code-rules-bad-examples-'));
  try {
    const rules = JSON.parse(readFileSync(resolve(componentRoot, 'scripts/rule-index.json'), 'utf8'));
    const expected = new Map();

    for (const name of readdirSync(referencesRoot).filter((name) => name.endsWith('.md'))) {
      const markdown = readFileSync(join(referencesRoot, name), 'utf8');
      const blocks = [...markdown.matchAll(/```ts\n([\s\S]*?)```/g)];
      let lastGoodContext;
      let currentRule;

      for (const [index, match] of blocks.entries()) {
        const code = match[1];
        const before = markdown.slice(0, match.index);
        const heading = [...before.matchAll(/^### \[(强制|推荐|规范)\] (.+)$/gm)].at(-1);
        if (heading) {
          const title = heading[2].split('（')[0];
          currentRule = rules.find((rule) => rule.title.split('（')[0] === title);
        }

        const key = `${name}#${index}`;
        if (code.startsWith('// good')) {
          lastGoodContext = externalContexts.get(key);
          continue;
        }
        if (!code.startsWith('// bad') || !currentRule?.eslintRule) continue;

        const context = lastGoodContext;
        const contents = `${context?.before ?? ''}${code}${context?.after ?? ''}`;
        const moduleContents = /^\s*(?:import|export)\b/m.test(contents)
          ? contents
          : `${contents}\nexport {};\n`;
        const filename = `${name}-${index}.ts`;
        writeFileSync(join(directory, filename), moduleContents);
        expected.set(filename, currentRule.eslintRule);
        for (const [file, fileContents] of Object.entries(context?.files ?? {})) {
          writeFileSync(join(directory, file), fileContents);
        }
      }
    }

    assert.ok(expected.size > 0);
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

    const result = spawnSync(process.execPath, [
      resolve(componentRoot, 'scripts/lint.mjs'),
      '.',
    ], { cwd: directory, encoding: 'utf8' });
    const output = `${result.stdout}\n${result.stderr}`;
    const misses = [];
    for (const [filename, expectedRule] of expected) {
      const escaped = filename.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const section = output.match(new RegExp(`(?:^|\\n)([^\\n]*${escaped}\\n)([\\s\\S]*?)(?=\\n/|\\n✖|$)`));
      const diagnostics = section?.[2] ?? '';
      if (!diagnostics.includes(expectedRule)) {
        misses.push(`${filename}: expected ${expectedRule}, got:\n${diagnostics.trim() || '(no diagnostics)'}`);
      }
    }
    assert.deepEqual(misses, []);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('valid fixture passes TypeScript strict compilation', () => {
  const result = spawnSync(process.execPath, [
    resolve('node_modules/typescript/bin/tsc'),
    '--noEmit',
    '--project',
    resolve('tests/fixtures/typescript-code-rules/tsconfig.json'),
  ], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
