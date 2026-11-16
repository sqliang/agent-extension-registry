#!/usr/bin/env node
/**
 * lint.mjs
 *
 * 用 typescript-code-rules 内置规则集对目标文件/目录跑 ESLint，
 * 不依赖目标项目自身的 eslint 配置。
 *
 * 用法：
 *   node scripts/lint.mjs <文件或目录...>
 *   node scripts/lint.mjs --help
 *
 * 工作方式：由 rule-index.json 生成临时 flat config 写到系统临时目录，
 * 然后通过 npx 临时拉起 eslint@9 + @typescript-eslint/parser + 插件执行。
 * 若本机没有 node/npx，打印降级提示并把配置写到临时目录，由用户自行执行。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { loadRuleIndex, buildEslintConfig } from './generate-eslint-config.mjs';

const LINT_PACKAGES = [
  'eslint@9.39.5',
  'typescript@5.9.3',
  '@typescript-eslint/parser@8.72.1',
  '@typescript-eslint/eslint-plugin@8.72.1',
];
const NPX_PACKAGE_ARGS = LINT_PACKAGES.flatMap((packageName) => ['-p', packageName]);

const USAGE = `用法: node lint.mjs <文件或目录...>

示例:
  node lint.mjs src/utils.ts
  node lint.mjs src/ packages/

说明:
  目标支持相对路径和绝对路径。使用内置规则集生成临时 eslint flat config，
  通过 npx 调用 eslint@9 与 @typescript-eslint 插件执行，不读取目标项目自身配置。
  未执行检查的降级路径返回非零退出码。`;

function hasCommand(cmd) {
  const result = spawnSync(cmd, ['--version'], { stdio: 'ignore', shell: false });
  return !result.error && result.status === 0;
}

function quoteShellArgument(value) {
  if (process.platform === 'win32') return JSON.stringify(value);
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function resolveNpxImports() {
  const script = `
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const executable = process.platform === 'win32' ? 'eslint.cmd' : 'eslint';
const binDirectory = process.env.PATH.split(path.delimiter).find((entry) =>
  entry.endsWith(path.join('node_modules', '.bin')) && fs.existsSync(path.join(entry, executable))
);
if (!binDirectory) throw new Error('Cannot locate the npx node_modules directory');
const npxRequire = createRequire(path.join(path.dirname(binDirectory), 'eslint', 'package.json'));
console.log(JSON.stringify({
  parser: npxRequire.resolve('@typescript-eslint/parser'),
  plugin: npxRequire.resolve('@typescript-eslint/eslint-plugin'),
}));
`;
  const result = spawnSync('npx', ['--yes', ...NPX_PACKAGE_ARGS, 'node', '-e', script], {
    encoding: 'utf8',
  });
  if (result.error || result.status !== 0) {
    throw new Error(result.error?.message ?? result.stderr);
  }
  const imports = JSON.parse(result.stdout.trim().split('\n').at(-1));
  return {
    parserImport: pathToFileURL(imports.parser).href,
    pluginImport: pathToFileURL(imports.plugin).href,
  };
}

function writeTempConfig(dependencyImports) {
  const rules = loadRuleIndex();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-code-rules-lint-'));
  const configPath = path.join(dir, 'eslint.config.mjs');
  fs.writeFileSync(configPath, buildEslintConfig(rules, dependencyImports));
  return configPath;
}

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

function main() {
  const args = process.argv.slice(2);
  const separatorIndex = args.indexOf('--');
  const optionArgs = separatorIndex === -1 ? args : args.slice(0, separatorIndex);

  if (args.length === 0 || optionArgs.includes('--help') || optionArgs.includes('-h')) {
    console.log(USAGE);
    process.exit(args.length === 0 ? 1 : 0);
  }

  const unknownOption = optionArgs.find((arg) => arg.startsWith('-'));
  if (unknownOption) {
    console.error(`错误: 未知选项 ${unknownOption}；以连字符开头的文件请放在 -- 之后`);
    console.error(USAGE);
    process.exit(1);
  }

  const targets = separatorIndex === -1
    ? args
    : [...args.slice(0, separatorIndex), ...args.slice(separatorIndex + 1)];
  if (targets.length === 0) {
    console.error('错误: 至少需要一个文件或目录');
    console.error(USAGE);
    process.exit(1);
  }

  const missing = targets.filter((t) => !fs.existsSync(path.resolve(t)));
  if (missing.length > 0) {
    console.error(`错误: 以下路径不存在: ${missing.join(', ')}`);
    console.error('');
    console.error(USAGE);
    process.exit(1);
  }

  let execution;
  try {
    execution = resolveExecution(targets);
  } catch (error) {
    console.error(`错误: ${error.message}`);
    process.exit(1);
  }

  if (!hasCommand('node') || !hasCommand('npx')) {
    const configPath = writeTempConfig();
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
  }

  let dependencyImports;
  try {
    dependencyImports = resolveNpxImports();
  } catch (error) {
    console.error(`依赖解析失败: ${error.message}`);
    process.exit(1);
  }

  const configPath = writeTempConfig(dependencyImports);
  console.log(`临时配置: ${configPath}`);

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

  if (result.error) {
    console.error(`执行失败: ${result.error.message}`);
    console.error(`可直接使用已生成的配置手动执行: ${configPath}`);
    process.exit(1);
  }

  // eslint 的退出码: 0=无问题, 1=有 lint 问题, 2=执行错误，原样透传
  process.exit(result.status ?? 1);
}

main();
