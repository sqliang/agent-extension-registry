# 模块规范

本文件覆盖模块系统：使用 ES2015 `import/export`、禁用 `require` 和 `namespace`、避免无用空导出与 `/// <reference path>`、同路径单次导入、顶层静态导入、命名导出和资源类型声明。`no-require-imports` 统一覆盖赋值形式的 `require`，不再重复配置已废弃的 `no-var-requires`。

### [强制] 不允许使用 require 引入模块

ESLint: `@typescript-eslint/no-require-imports` · [官方文档](https://typescript-eslint.io/rules/no-require-imports/)

统一使用 ES6 的 `import` 语法引入模块，不要使用 CommonJS 的 `require()` 调用或 `import foo = require('foo')` 形式。

```json
{ "@typescript-eslint/no-require-imports": "error" }
```

```ts
// good
import * as lib1 from 'lib1';
import { lib2 } from 'lib2';
import lib3 from 'lib3';
```

```ts
// bad
const lib1 = require('lib1');
const { lib2 } = require('lib2');
import lib3 = require('lib3');
```

### [强制] 禁止命名空间 namespace/module

ESLint: `@typescript-eslint/no-namespace` · [官方文档](https://typescript-eslint.io/rules/no-namespace/)

`module Example {}`（后改名 `namespace`）是 TypeScript 早期的代码组织形式，已经过时，现在首选 ES2015 模块语法（`import/export`）。规范版「除类型声明文件外不使用 module/namespace 关键字」与本规则一致。注意：类型声明文件中描述外部 API 的 `declare module 'foo' {}` 不受影响。

```json
{ "@typescript-eslint/no-namespace": "error" }
```

```ts
// good
declare module 'foo' {} // d.ts 中描述外部模块，允许
```

```ts
// bad
module foo {}
namespace foo {}
declare module foo {}
declare namespace foo {}
```

### [强制] 禁止导出无用的空 export {}

ESLint: `@typescript-eslint/no-useless-empty-export` · [官方文档](https://typescript-eslint.io/rules/no-useless-empty-export/)

空的 `export {}` 的唯一合法用途是把脚本文件转为模块文件；当文件中已经有其他顶级导入或导出时，它就完全没有作用，应当删除。

```json
{ "@typescript-eslint/no-useless-empty-export": "error" }
```

```ts
// good
import 'some-other-module';

export const value = 'Hello, world!';
```

```ts
// bad
export const value = 'Hello, world!';
export {}; // 已有其他导出，这个空导出没有作用

import 'some-other-module';
export {};
```

### [规范] 使用 ECMAScript 2015 标准的模块系统

模块的导入导出一律使用 ES2015 标准的 `import`/`export`，不混用 CommonJS（`require`/`module.exports`）、AMD 等其他模块体系。与 `no-require-imports` 配套执行。

```ts
// good
import foo from 'foo';

export function bar() {
  // ...
}

export default foo;
```

```ts
// bad
import foo = require('foo');

export = foo;
```

### [规范] 不使用 /// <reference path>

`/// <reference path="..." />` 是 ES2015 模块普及之前的文件间依赖声明方式，路径硬编码、无法被打包工具分析。一律改用 `import`（类型依赖用 `import type`）。

```ts
// good
import { foo } from './foo';
```

```ts
// bad
/// <reference path="./foo.ts" />
```

### [规范] 对于同一个模块路径仅 import 一次

同一路径的多个 `import` 语句应合并为一条，避免分散的导入让依赖关系难以追踪。

```ts
// good
import { PureComponent } from 'react';
```

```ts
// bad
import React from 'react';
import { PureComponent } from 'react';
```

### [规范] 为样式/图片等资源编写类型声明文件

使用 webpack 等构建工具的项目，在模块中引入样式、图片等非代码资源时，应为资源编写类型声明文件（或使用合适的 loader 自动生成），避免用 `require<any>` 绕过类型检查。

```ts
// good
// Button.scss.d.ts
export const clicked: string;

// logo.png.d.ts
declare const logo: string;
export default logo;

// Button.tsx
import styles from './Button.scss';
import logo from './logo.png';
```

```ts
// bad
const styles = require<any>('./Button.scss');
const logo = require<string>('./logo.png');
```

### [规范] 静态 import 位于模块顶部的导入区域

静态依赖集中放在文件顶部，便于分析依赖关系。按需加载使用动态 `import()` 并说明加载边界，不把静态 `import` 声明混入函数或普通语句之间。

```ts
// good
import { formatDate } from './date.js';

export function render(date: Date) {
  return formatDate(date);
}
```

```ts
// bad
export function render(date: Date) {
  return formatDate(date);
}

import { formatDate } from './date.js';
```

### [规范] 无单一主体值的工具模块使用命名导出

模块提供多个可独立使用的函数或常量时，命名导出能保留调用点语义并支持静态分析。模块确实只有一个主体值时可使用默认导出，不为统一形式而强加默认导出。

```ts
// good
export function formatDate(date: Date) { /* ... */ }
export function parseDate(value: string) { /* ... */ }
```

```ts
// bad
export default {
  formatDate,
  parseDate,
};
```
