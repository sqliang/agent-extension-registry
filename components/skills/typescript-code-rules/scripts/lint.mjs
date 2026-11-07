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
import { spawnSync } from 'node:child_process';
import { loadRuleIndex, buildEslintConfig } from './generate-eslint-config.mjs';

const USAGE = `用法: node lint.mjs <文件或目录...>

示例:
  node lint.mjs src/utils.ts
  node lint.mjs src/ packages/

说明:
  使用内置规则集（scripts/rule-index.json）生成临时 eslint flat config，
  通过 npx 调用 eslint@9 与 @typescript-eslint 插件执行，不读取目标项目自身配置。`;

function hasCommand(cmd) {
  const result = spawnSync(cmd, ['--version'], { stdio: 'ignore', shell: false });
  return !result.error && result.status === 0;
}

function writeTempConfig() {
  const rules = loadRuleIndex();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-code-rules-lint-'));
  const configPath = path.join(dir, 'eslint.config.mjs');
  fs.writeFileSync(configPath, buildEslintConfig(rules));
  return configPath;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(USAGE);
    process.exit(args.length === 0 ? 1 : 0);
  }

  const targets = args.filter((a) => !a.startsWith('-'));
  const missing = targets.filter((t) => !fs.existsSync(path.resolve(t)));
  if (missing.length > 0) {
    console.error(`错误: 以下路径不存在: ${missing.join(', ')}`);
    console.error('');
    console.error(USAGE);
    process.exit(1);
  }

  if (!hasCommand('node') || !hasCommand('npx')) {
    const configPath = writeTempConfig();
    console.log('降级提示: 未检测到可用的 node/npx，无法自动执行 ESLint。');
    console.log(`规则配置已生成到: ${configPath}`);
    console.log('请在具备 node/npx 的环境中自行执行:');
    console.log('');
    console.log(
      `  npx --yes -p eslint@9 -p typescript -p @typescript-eslint/parser -p @typescript-eslint/eslint-plugin eslint --config "${configPath}" ${targets.join(' ')}`
    );
    process.exit(0);
  }

  const configPath = writeTempConfig();
  console.log(`临时配置: ${configPath}`);

  const npxArgs = [
    '--yes',
    '-p', 'eslint@9',
    '-p', 'typescript',
    '-p', '@typescript-eslint/parser',
    '-p', '@typescript-eslint/eslint-plugin',
    'eslint',
    '--config', configPath,
    ...targets,
  ];

  console.log(`执行: npx ${npxArgs.join(' ')}`);
  const result = spawnSync('npx', npxArgs, { stdio: 'inherit' });

  if (result.error) {
    console.error(`执行失败: ${result.error.message}`);
    console.error(`可直接使用已生成的配置手动执行: ${configPath}`);
    process.exit(1);
  }

  // eslint 的退出码: 0=无问题, 1=有 lint 问题, 2=执行错误，原样透传
  process.exit(result.status ?? 1);
}

main();
