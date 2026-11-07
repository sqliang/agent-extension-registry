#!/usr/bin/env node
/**
 * review-checklist.mjs
 *
 * 从 rule-index.json 生成 Code Review 用的 Markdown 核查清单：
 * 按 category 分组，组内按 强制(error) -> 推荐(warn) -> 规范(style) 排序，
 * 每条输出一个 `- [ ]` 复选框。
 *
 * 用法：
 *   node scripts/review-checklist.mjs                 # 全部规则
 *   node scripts/review-checklist.mjs --level error   # 只输出强制项
 *   node scripts/review-checklist.mjs --category types # 只输出某个类别
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const RULE_INDEX_PATH = path.join(SCRIPTS_DIR, 'rule-index.json');

const CATEGORY_LABELS = {
  naming: '命名',
  types: '类型声明',
  assertions: '断言与非空',
  'arrays-objects': '数组与对象',
  'control-flow': '条件与循环',
  classes: '类',
  modules: '模块',
  async: '异步与 Promise',
  enums: '枚举',
};

const LEVEL_ORDER = { error: 0, warn: 1, style: 2 };
const LEVEL_LABELS = { error: '强制', warn: '推荐', style: '规范' };

const USAGE = `用法: node review-checklist.mjs [--level error|warn|style] [--category <类别>]

选项:
  --level error     只输出强制项
  --category <类别>  只输出某个类别（naming/types/assertions/arrays-objects/control-flow/classes/modules/async/enums）

默认输出全部规则的 Markdown 核查清单到 stdout。`;

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(USAGE);
    return;
  }

  let levelFilter = null;
  let categoryFilter = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--level') levelFilter = args[++i];
    if (args[i] === '--category') categoryFilter = args[++i];
  }

  const rules = JSON.parse(fs.readFileSync(RULE_INDEX_PATH, 'utf8'));

  const grouped = new Map();
  for (const rule of rules) {
    if (levelFilter && rule.level !== levelFilter) continue;
    if (categoryFilter && rule.category !== categoryFilter) continue;
    if (!grouped.has(rule.category)) grouped.set(rule.category, []);
    grouped.get(rule.category).push(rule);
  }

  if (grouped.size === 0) {
    console.error('没有匹配的规则，请检查 --level/--category 参数。');
    console.error('');
    console.error(USAGE);
    process.exit(1);
  }

  const lines = ['# TypeScript 编码规范 Review 核查清单', ''];

  for (const [category, items] of grouped) {
    items.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
    lines.push(`## ${CATEGORY_LABELS[category] ?? category}（${category}）`, '');
    for (const rule of items) {
      const label = LEVEL_LABELS[rule.level] ?? rule.level;
      const ruleName = rule.eslintRule ? ` \`${rule.eslintRule}\`` : '';
      lines.push(`- [ ] [${label}] ${rule.title}${ruleName}`);
    }
    lines.push('');
  }

  console.log(lines.join('\n'));
}

main();
