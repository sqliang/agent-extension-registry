# 模块规范

本文件覆盖模块系统相关规则：禁用 `require` 引入、`namespace`/`module` 关键字、无用的空 `export {}`，以及 ES2015 模块系统、禁用 `/// <reference path>`、同路径单次导入、资源类型声明文件的规范。

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

### [强制] 禁止 var foo = require('foo') 形式的导入

ESLint: `@typescript-eslint/no-var-requires` · [官方文档](https://typescript-eslint.io/rules/no-var-requires/)

禁止使用 `var/let/const foo = require('foo')` 的语句，应当使用 ES6 样式的模块导入替代。本规则与 `no-require-imports` 互补，重点拦截赋值形式的 require。

```json
{ "@typescript-eslint/no-var-requires": "error" }
```

```ts
// good
import foo from 'foo';
```

```ts
// bad
var foo = require('foo');
const foo = require('foo');
let foo = require('foo');
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
export const value = 'Hello, world!';

import 'some-other-module';
```

```ts
// bad
export const value = 'Hello, world!';
export {}; // 已有其他导出，这个空导出没有作用

import 'some-other-module';
export {};
```

### [强制] 使用 ECMAScript 2015 标准的模块系统

模块的导入导出一律使用 ES2015 标准的 `import`/`export`，不混用 CommonJS（`require`/`module.exports`）、AMD 等其他模块体系。与 `no-require-imports`、`no-var-requires` 配套执行。

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

### [强制] 不使用 /// <reference path>

`/// <reference path="..." />` 是 ES2015 模块普及之前的文件间依赖声明方式，路径硬编码、无法被打包工具分析。一律改用 `import`（类型依赖用 `import type`）。

```ts
// good
import { foo } from './foo';
```

```ts
// bad
/// <reference path="./foo.ts" />
```

### [强制] 对于同一个模块路径仅 import 一次

同一路径的多个 `import` 语句应合并为一条，避免分散的导入让依赖关系难以追踪。

```ts
// good
import React, { PureComponent } from 'react';
```

```ts
// bad
import React from 'react';
import { PureComponent } from 'react';
```

### [建议] 为样式/图片等资源编写类型声明文件

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
