# 断言与非空规范

本文件覆盖类型断言与空值处理相关规则：as vs `<>` 断言风格、非空断言 `!` 的各种限制、`??`/`?.` 优先、`as const`、`@ts-expect-error` 替代 `@ts-ignore`、禁用 tslint 命令注释。

### [推荐] 使用一致的方式进行类型断言（as 优先）

ESLint: `@typescript-eslint/consistent-type-assertions` · [官方文档](https://typescript-eslint.io/rules/consistent-type-assertions/)

TypeScript 支持 `<Type>value` 和 `value as Type` 两种断言方式。统一使用 `as`（尖括号写法还会与 JSX 冲突）；对象字面量在定义变量时优先用类型注解而非断言，作为参数传入时允许 `as T`。规范版「使用 as 进行类型转换，不使用 <>」与本规则一致，以本规则为准。

```json
{
  "@typescript-eslint/consistent-type-assertions": [
    "warn",
    { "assertionStyle": "as", "objectLiteralTypeAssertions": "allow-as-parameter" }
  ]
}
```

```ts
// good
const x: T = { /* ... */ }; // 类型注解总是优于 as 断言
const y = { /* ... */ } as unknown; // 定义变量时可以断言为 unknown
const root = document.getElementById('root') as HTMLDivElement;

foo({ /* ... */ } as T); // 变量作为参数使用时可用 as 断言
new Clazz({ /* ... */ } as T);
```

```ts
// bad
const x = { /* ... */ } as T; // 定义变量时应直接标注类型

function foo() {
  return { /* ... */ } as T;
}

const root = <HTMLDivElement>document.getElementById('root'); // 不使用 <>
```

### [强制] 禁止不必要的类型断言

ESLint: `@typescript-eslint/no-unnecessary-type-assertion` · [官方文档](https://typescript-eslint.io/rules/no-unnecessary-type-assertion/)

如果断言的结果与编译器推断的类型相同，断言就是多余的，留在代码中只会影响可读性。

```json
{ "@typescript-eslint/no-unnecessary-type-assertion": "error" }
```

```ts
// good
const foo = 3 as number;

function bar(x: number | undefined): number {
  return x!; // x 可能为 undefined，此断言是必要的
}
```

```ts
// bad
const foo = 3;
const bar = foo!; // foo 本来就是 number，断言多余

type Foo = 3;
const baz = 3 as Foo; // 3 的类型本来就是 3

function qux(x: number): number {
  return x!; // x 不可能为 null/undefined，断言多余
}
```

### [推荐] 不使用非空断言 !

ESLint: `@typescript-eslint/no-non-null-assertion` · [官方文档](https://typescript-eslint.io/rules/no-non-null-assertion/)

用 `!` 断言绕过编译器的非空检查，通常意味着类型安全存在隐患。更好的做法是重构代码逻辑（如可选链 + 空值合并），让 TypeScript 能自行理解值何时可能为空。规范版「不使用 ! 声明对象属性非空」与本规则一致，以本规则为准。

```json
{ "@typescript-eslint/no-non-null-assertion": "warn" }
```

```ts
// good
interface Example {
  property?: string;
}

declare const foo: Example;
const includesBaz = foo.property?.includes('baz') ?? false;

if (foo.bar && foo.bar.baz) {
  // ...
}
```

```ts
// bad
declare const foo: Example;
const includesBaz = foo.property!.includes('baz');

if (foo!.bar!.baz) {
  // ...
}
```

### [强制] 禁止额外的非空断言

ESLint: `@typescript-eslint/no-extra-non-null-assertion` · [官方文档](https://typescript-eslint.io/rules/no-extra-non-null-assertion/)

对同一个值多次使用 `!` 没有任何额外作用，属于明显的书写错误。

```json
{ "@typescript-eslint/no-extra-non-null-assertion": "error" }
```

```ts
// good
const foo: { bar: number } | null = null;
const bar = foo!.bar;

function baz(bar?: { n: number }) {
  return bar?.n;
}
```

```ts
// bad
const foo: { bar: number } | null = null;
const bar = foo!!!.bar;

function baz(bar?: { n: number }) {
  return bar!?.n;
}
```

### [推荐] 不允许非空断言与可选链同时使用

ESLint: `@typescript-eslint/no-non-null-asserted-optional-chain` · [官方文档](https://typescript-eslint.io/rules/no-non-null-asserted-optional-chain/)

可选链的结果本身就可能为空，再对其做非空断言很可能是错误的，说明对空值的处理逻辑没有想清楚。

```json
{ "@typescript-eslint/no-non-null-asserted-optional-chain": "warn" }
```

```ts
// good
foo?.bar;
foo?.bar();
```

```ts
// bad
foo?.bar!;
foo?.bar()!;
```

### [强制] 不允许在空值合并运算符左操作数中使用非空断言

ESLint: `@typescript-eslint/no-non-null-asserted-nullish-coalescing` · [官方文档](https://typescript-eslint.io/rules/no-non-null-asserted-nullish-coalescing/)

`??` 用于在左侧为 `null`/`undefined` 时提供默认值，在左侧使用 `!` 断言「不为空」自相矛盾，通常意味着混淆了两个运算符的语义。

```json
{ "@typescript-eslint/no-non-null-asserted-nullish-coalescing": "error" }
```

```ts
// good
foo ?? bar;
foo ?? bar!;
foo!.bazz ?? bar;
foo() ?? bar;
```

```ts
// bad
foo! ?? bar;
foo.bazz! ?? bar;
foo!.bazz! ?? bar;
foo()! ?? bar;
```

### [强制] 使用 === 判断时不混用易混淆的非空断言

ESLint: `@typescript-eslint/no-confusing-non-null-assertion` · [官方文档](https://typescript-eslint.io/rules/no-confusing-non-null-assertion/)

`foo.bar! == 'hello'` 这样的写法容易和 `!==` 混淆。要么省略不必要的非空断言，要么用括号把组合值包裹起来加以区分。

```json
{ "@typescript-eslint/no-confusing-non-null-assertion": "error" }
```

```ts
// good
interface Foo {
  bar?: string;
  num?: number;
}

declare const foo: Foo;
const isEqualsBar = foo.bar == 'hello';
const isEqualsNum = (1 + foo.num!) == 2;
```

```ts
// bad
declare const foo: Foo;
const isEqualsBar = foo.bar! == 'hello'; // 容易误读为 !==
const isEqualsNum = 1 + foo.num! == 2;
```

### [推荐] 断言非空时优先使用 ! 而非 as

ESLint: `@typescript-eslint/non-nullable-type-assertion-style` · [官方文档](https://typescript-eslint.io/rules/non-nullable-type-assertion-style/)

断言一个值不是 `null`/`undefined` 有两种方式：`!` 非空断言和 `as` 等效类型断言。当二者作用相同时优先用 `!`，代码更短，且类型变化时不易失去同步。

```json
{ "@typescript-eslint/non-nullable-type-assertion-style": "warn" }
```

```ts
// good
const maybe = Math.random() > 0.5 ? '' : undefined;
const definitely = maybe!;
```

```ts
// bad
const maybe = Math.random() > 0.5 ? '' : undefined;
const definitely = maybe as string;
const alsoDefinitely = <string>maybe;
```

### [强制] 字面类型强制使用 as const

ESLint: `@typescript-eslint/prefer-as-const` · [官方文档](https://typescript-eslint.io/rules/prefer-as-const/)

告诉 TypeScript 一个字面量应被解释为字面类型（如 `2`）而非通用类型（如 `number`）有两种方式：`as const` 或 `as` 加字面类型。推荐 `as const`，无需把字面值再写一遍。

```json
{ "@typescript-eslint/prefer-as-const": "error" }
```

```ts
// good
let foo = 'bar' as const;
let bar: 'bar' = 'bar' as const;
let baz = 'bar' as string; // 显式标注为通用类型是允许的
```

```ts
// bad
let bar: 2 = 2;
let foo = <'bar'>'bar';
let obj = { bar: 'baz' as 'baz' };
```

### [推荐] 使用空值合并运算符 ?? 替代 ||

ESLint: `@typescript-eslint/prefer-nullish-coalescing` · [官方文档](https://typescript-eslint.io/rules/prefer-nullish-coalescing/)

`??` 只在左侧为 `null`/`undefined` 时返回右侧，而 `||` 对任何假值（`''`、`0`、`false`）都返回右侧。处理「可能为空」的语义时应使用 `??`，避免把合法的假值误当作空。注意 `??` 没有算术优先级，与 `&&`/`||` 混用时需加括号。

```json
{ "@typescript-eslint/prefer-nullish-coalescing": "warn" }
```

```ts
// good
declare const foo: string | undefined;
foo ?? 'a string';

declare const a: string | null;
declare const b: string | null;
declare const c: string;
a ?? (b && c); // 与 && 混用时用括号隔离
```

```ts
// bad
declare const foo: string | undefined;
foo || 'a string'; // foo 为 '' 时也会取右侧，可能不符合预期
```

### [推荐] 优先使用可选链运算符 ?.

ESLint: `@typescript-eslint/prefer-optional-chain` · [官方文档](https://typescript-eslint.io/rules/prefer-optional-chain/)

访问可能为 `null`/`undefined` 的嵌套属性时，`?.` 比一长串 `&&` 判断简洁得多，也更不容易写错。

```json
{ "@typescript-eslint/prefer-optional-chain": "warn" }
```

```ts
// good
foo?.a?.b?.c;
foo?.['a']?.b?.c;
foo?.a?.b?.method?.();
!foo?.bar;
```

```ts
// bad
foo && foo.a && foo.a.b && foo.a.b.c;
foo && foo['a'] && foo['a'].b && foo['a'].b.c;
foo && foo.a && foo.a.b && foo.a.b.method && foo.a.b.method();
!foo || !foo.bar || !foo.bar.baz || !foo.bar.baz();
```

### [强制] 禁止通过 ts 命令注释强制解除类型检查

ESLint: `@typescript-eslint/ban-ts-comment` · [官方文档](https://typescript-eslint.io/rules/ban-ts-comment/)

`@ts-<directive>` 注释指令可以关闭单行或整个文件的类型检查。约定：`@ts-expect-error` 允许使用但必须带不少于 3 个字的说明；`@ts-ignore`、`@ts-nocheck` 禁止使用；`@ts-check` 允许使用。

```json
{
  "@typescript-eslint/ban-ts-comment": [
    "error",
    {
      "ts-expect-error": "allow-with-description",
      "ts-ignore": true,
      "ts-nocheck": true,
      "ts-check": false,
      "minimumDescriptionLength": 3
    }
  ]
}
```

```ts
// good
if (false) {
  // 编译器会提示不可达代码
  console.log('hello');
}

// @ts-expect-error: 这里故意构造类型错误用于测试
const str: string = 1;
```

```ts
// bad
if (false) {
  // @ts-ignore: Unreachable code error
  console.log('hello');
}

// @ts-nocheck —— 整个文件关闭类型检查，不允许
```

### [强制] 禁止通过命令注释强制解除 tslint 检查

ESLint: `@typescript-eslint/ban-tslint-comment` · [官方文档](https://typescript-eslint.io/rules/ban-tslint-comment/)

不允许使用 `// tslint:<rule-flag>` 或 `/* tslint:<rule-flag> */` 形式的注释指令解除单行或整个文件的规范检查。tslint 已废弃，这类注释不应再出现在代码中（普通注释里提及 tslint 字样不受影响）。

```json
{ "@typescript-eslint/ban-tslint-comment": "error" }
```

```ts
// good
// This is a comment that just happens to mention tslint
someCode(); // 普通注释中提到 tslint 没问题
```

```ts
// bad
/* tslint:disable */
/* tslint:enable */
/* tslint:disable:rule1 rule2 rule3 */
// tslint:disable-next-line
someCode(); // tslint:disable-line
```

### [强制] 使用 @ts-expect-error 替代 @ts-ignore

ESLint: `@typescript-eslint/prefer-ts-expect-error` · [官方文档](https://typescript-eslint.io/rules/prefer-ts-expect-error/)

两个指令都能豁免单行 TS 报错，区别在于：`@ts-expect-error` 标记在已经没有错误的代码上时反而会报错，而 `@ts-ignore` 不会。问题修复后遗留的 `@ts-ignore` 会继续掩盖新出现的问题，因此强制使用 `@ts-expect-error`。

```json
{ "@typescript-eslint/prefer-ts-expect-error": "error" }
```

```ts
// good
// @ts-expect-error
const str: string = 1;

const isOptionEnabled = (key: string): boolean => {
  // @ts-expect-error: if key isn't in globalOptions it'll be undefined which is false
  return !!globalOptions[key];
};
```

```ts
// bad
// @ts-ignore
const str: string = 1;

const isOptionEnabled = (key: string): boolean => {
  // @ts-ignore: if key isn't in globalOptions it'll be undefined which is false
  return !!globalOptions[key];
};
```
