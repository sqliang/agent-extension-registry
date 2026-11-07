#!/usr/bin/env node
/**
 * generate-eslint-config.mjs
 *
 * 从 rule-index.json 生成：
 *   1. ESLint flat config（eslint.config.mjs 格式，含 @typescript-eslint/parser 与插件）
 *   2. tsconfig compilerOptions 建议片段
 *
 * 用法：
 *   node scripts/generate-eslint-config.mjs            # 打印到 stdout
 *   node scripts/generate-eslint-config.mjs --out DIR  # 写入 DIR/eslint.config.mjs 与 DIR/tsconfig.recommendations.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const RULE_INDEX_PATH = path.join(SCRIPTS_DIR, 'rule-index.json');

/**
 * 规则的具体配置项（从源规范文档的 JSON 提取），key 为 @typescript-eslint/ 后的短名，
 * value 为规则配置数组中级别之后的部分。没有配置项的规则不出现在此表中。
 */
export const RULE_OPTIONS = {
  'array-type': [{ default: 'array-simple', readonly: 'generic' }],
  'ban-ts-comment': [
    {
      'ts-expect-error': 'allow-with-description',
      'ts-ignore': true,
      'ts-nocheck': true,
      'ts-check': false,
      minimumDescriptionLength: 3,
    },
  ],
  'consistent-generic-constructors': ['constructor'],
  'consistent-indexed-object-style': ['record'],
  'consistent-type-assertions': [
    { assertionStyle: 'as', objectLiteralTypeAssertions: 'allow-as-parameter' },
  ],
  'consistent-type-definitions': ['interface'],
  'explicit-member-accessibility': [{ accessibility: 'no-public' }],
  'member-delimiter-style': [{ multiline: 'semi', singleline: 'comma' }],
  'naming-convention': [
    { selector: 'default', format: ['camelCase'], leadingUnderscore: 'forbid', trailingUnderscore: 'forbid' },
    { selector: 'variableLike', format: ['camelCase', 'UPPER_CASE'], leadingUnderscore: 'forbid', trailingUnderscore: 'forbid' },
    { selector: 'memberLike', format: ['camelCase'], leadingUnderscore: 'forbid', trailingUnderscore: 'forbid' },
    { selector: 'property', format: ['camelCase'], leadingUnderscore: 'forbid', trailingUnderscore: 'forbid' },
    { selector: 'method', format: ['camelCase'], leadingUnderscore: 'forbid', trailingUnderscore: 'forbid' },
    { selector: 'typeLike', format: ['PascalCase'], leadingUnderscore: 'forbid', trailingUnderscore: 'forbid' },
    { selector: 'enumMember', format: ['PascalCase', 'UPPER_CASE'], leadingUnderscore: 'forbid', trailingUnderscore: 'forbid' },
  ],
  'prefer-literal-enum-member': [{ allowBitwiseExpressions: true }],
  'restrict-plus-operands': [{ checkCompoundAssignments: false, allowAny: false }],
  'restrict-template-expressions': [
    { allowNumber: true, allowBoolean: true, allowAny: false, allowNullish: false, allowRegExp: true },
  ],
  'type-annotation-spacing': [
    { before: false, after: true, overrides: { arrow: { before: true, after: true } } },
  ],
};

/** tsconfig compilerOptions 建议片段（来自规范 2.1 节，不进入 references）。 */
export const TSCONFIG_RECOMMENDATIONS = {
  compilerOptions: {
    strict: true,
    noImplicitReturns: true,
    noUnusedLocals: true,
    allowSyntheticDefaultImports: true,
  },
};

export function loadRuleIndex(indexPath = RULE_INDEX_PATH) {
  return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
}

/** 由 rule-index.json 生成 ESLint rules 对象；style 级规则无 ESLint 对应，自动跳过。 */
export function buildEslintRules(rules) {
  const result = {};
  for (const rule of rules) {
    if (!rule.eslintRule) continue;
    const shortName = rule.eslintRule.replace('@typescript-eslint/', '');
    const options = RULE_OPTIONS[shortName];
    result[rule.eslintRule] = options ? [rule.level, ...options] : rule.level;
  }
  return result;
}

/** 生成 eslint.config.mjs 文件内容。 */
export function buildEslintConfig(rules) {
  const rulesObject = buildEslintRules(rules);
  const rulesJson = JSON.stringify(rulesObject, null, 4)
    .split('\n')
    .map((line) => `      ${line}`)
    .join('\n');

  return `// 由 typescript-code-rules skill 的 scripts/generate-eslint-config.mjs 生成
// 依赖：eslint@9、@typescript-eslint/parser、@typescript-eslint/eslint-plugin、typescript
// 注意：大量规则属于类型感知（type-aware）规则，需要 parserOptions.projectService 指向 tsconfig
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: ${rulesJson.trimStart()},
  },
];
`;
}

/** 生成 tsconfig 建议片段的 JSON 文本。 */
export function buildTsconfigRecommendations() {
  return JSON.stringify(TSCONFIG_RECOMMENDATIONS, null, 2) + '\n';
}

function main() {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf('--out');

  if (args.includes('--help') || args.includes('-h')) {
    console.log('用法: node generate-eslint-config.mjs [--out <dir>]');
    console.log('  默认将 eslint.config.mjs 内容与 tsconfig 建议打印到 stdout');
    console.log('  --out <dir>  写入 <dir>/eslint.config.mjs 与 <dir>/tsconfig.recommendations.json');
    return;
  }

  const rules = loadRuleIndex();
  const eslintConfig = buildEslintConfig(rules);
  const tsconfigJson = buildTsconfigRecommendations();

  if (outIndex !== -1) {
    const outDir = args[outIndex + 1];
    if (!outDir) {
      console.error('错误: --out 需要一个目录参数');
      process.exit(1);
    }
    fs.mkdirSync(outDir, { recursive: true });
    const configPath = path.join(outDir, 'eslint.config.mjs');
    const tsconfigPath = path.join(outDir, 'tsconfig.recommendations.json');
    fs.writeFileSync(configPath, eslintConfig);
    fs.writeFileSync(tsconfigPath, tsconfigJson);
    console.log(`已写入 ${configPath}`);
    console.log(`已写入 ${tsconfigPath}`);
    console.log('提示: 使用前请安装依赖 eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin typescript');
    return;
  }

  console.log('--- eslint.config.mjs ---');
  console.log(eslintConfig);
  console.log('--- tsconfig.recommendations.json ---');
  console.log(tsconfigJson);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main();
}
