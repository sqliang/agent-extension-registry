# 类型声明规范

本文件覆盖类型声明相关规则：数组类型写法、禁用内置类型别名与 `any`、可推导类型标注、联合/交叉类型冗余成员、void 使用位置、Record 风格、interface vs type、泛型构造器、函数类型、成员分隔符、类型标注空格、重载相邻，以及 no-unsafe-* 系列。

### [强制] 使用规范的数组类型定义形式

ESLint: `@typescript-eslint/array-type` · [官方文档](https://typescript-eslint.io/rules/array-type/)

TypeScript 中 `T[]` 和 `Array<T>` 功能一致，统一分工可以让代码库更易读：T 为简单类型（原始类型或其引用）时用 `T[]`；T 为联合、交叉、对象、函数类型时用 `Array<T>`；只读数组统一用 `ReadonlyArray<T>`/`Array<T>` 形式。规范版「数组元素为不可变数据时使用 ReadonlyArray<T>」的建议已由本规则的 `readonly: "generic"` 配置覆盖，二者一致。

```json
{ "@typescript-eslint/array-type": ["error", { "default": "array-simple", "readonly": "generic" }] }
```

```ts
// good
const a: Array<string | number> = ['a', 'b'];
const b: Array<{ prop: string }> = [{ prop: 'a' }];
const c: Array<() => void> = [() => {}];
const d: MyType[] = ['a', 'b'];
const e: string[] = ['a', 'b'];
const f: ReadonlyArray<string> = ['a', 'b'];
```

```ts
// bad
const a: (string | number)[] = ['a', 'b'];
const b: { prop: string }[] = [{ prop: 'a' }];
const c: (() => void)[] = [() => {}];
const d: Array<MyType> = ['a', 'b'];
const e: Array<string> = ['a', 'b'];
const f: readonly string[] = ['a', 'b'];
```

### [强制] 禁用 String/Object/Function 等内置类型别名定义类型

ESLint: `@typescript-eslint/no-restricted-types` · [官方文档](https://typescript-eslint.io/rules/no-restricted-types/)

不允许使用 `String`、`Number`、`Boolean`、`Symbol`、`BigInt`、`Object`、`Function` 等内置类型别名进行类型定义：大写形式是包装对象类型而非原始类型，`Object`/`Function` 过于宽泛且不安全。空对象类型 `{}` 由 `no-empty-object-type` 检查。本规则替代已废弃的 `ban-types`。

```json
{
  "@typescript-eslint/no-restricted-types": [
    "error",
    {
      "types": {
        "String": { "message": "使用小写 string。", "fixWith": "string" },
        "Number": { "message": "使用小写 number。", "fixWith": "number" },
        "Boolean": { "message": "使用小写 boolean。", "fixWith": "boolean" },
        "Symbol": { "message": "使用小写 symbol。", "fixWith": "symbol" },
        "BigInt": { "message": "使用小写 bigint。", "fixWith": "bigint" },
        "Object": { "message": "使用 object 或更精确的对象类型。", "fixWith": "object" },
        "Function": { "message": "使用明确的函数类型。" }
      }
    }
  ]
}
```

```ts
// good
const str = 'foo';
const bool = true;
const num = 1;
const symb = Symbol('foo');
const bigInt = 1n;
const func: () => number = () => 1;
const lowerObj: object = {};
const capitalObj: { a: string } = { a: 'string' };
const record: Record<'a', string> = { a: 'string' };
```

```ts
// bad
const str: String = 'foo';
const bool: Boolean = true;
const num: Number = 1;
const lowerObj: Object = {};
const curly: {} = { a: 'string' };
```

### [推荐] 不允许使用 any 类型

ESLint: `@typescript-eslint/no-explicit-any` · [官方文档](https://typescript-eslint.io/rules/no-explicit-any/)

`any` 是类型系统的危险「逃生舱」，会禁用大量类型检查，只应作为最后手段或原型代码使用。需要任意值时优先考虑 `unknown` 或泛型。

```json
{ "@typescript-eslint/no-explicit-any": "warn" }
```

```ts
// good
const age = 17;
const ages = [17];
const identity = <T>(x: T) => x;

function greet(): string {
  return 'hello';
}
```

```ts
// bad
const age: any = 'seventeen';
const ages: any[] = ['seventeen'];
const identity = (x: any) => x;

function greet(): any {
  return 'hello';
}
```

### [强制] 可推导的初始值不显式标注类型

ESLint: `@typescript-eslint/no-inferrable-types` · [官方文档](https://typescript-eslint.io/rules/no-inferrable-types/)

TypeScript 能从默认值或初始值推断出类型，显式标注只会增加冗余，有时还会妨碍推断出更精确的字面量类型。规范版「不应显式声明可以自动推导的类型」与本规则等价，以本规则为准。

```json
{ "@typescript-eslint/no-inferrable-types": "error" }
```

```ts
// good
const a = 10;
const b = true;
const c = `str`;

class Foo {
  prop = 5;
}

function fn(a = 5, b = true) {}
```

```ts
// bad
const a: number = 10;
const b: boolean = true;
const c: string = `str`;

class Foo {
  prop: number = 5;
}

function fn(a: number = 5, b: boolean = true) {}
```

### [强制] 不允许冗余的联合/交叉类型成员

ESLint: `@typescript-eslint/no-redundant-type-constituents` · [官方文档](https://typescript-eslint.io/rules/no-redundant-type-constituents/)

联合类型中 `any`/`unknown` 会覆盖其他所有成员，基本类型会覆盖其字面量类型；交叉类型中 `any`/`never` 覆盖其他成员，`unknown` 不起作用。保留这些冗余成员会误导读者。

```json
{ "@typescript-eslint/no-redundant-type-constituents": "error" }
```

```ts
// good
type UnionUnknown = unknown;
type UnionStringLiteral = string;
type IntersectionUnknown = string;
type IntersectionStringLiteral = 'foo';
```

```ts
// bad
type UnionAny = any | 'foo';
type UnionUnknown = unknown | 'foo';
type UnionStringLiteral = string | 'foo';
type IntersectionAny = any & 'foo';
type IntersectionUnknown = string & unknown;
type IntersectionStringLiteral = string & 'foo';
```

### [强制] void 只允许出现在返回类型或泛型参数中

ESLint: `@typescript-eslint/no-invalid-void-type` · [官方文档](https://typescript-eslint.io/rules/no-invalid-void-type/)

`void` 表示「要忽略的函数返回值」，在返回类型或泛型参数之外使用通常是程序错误；如果你需要「可能没有值」，应该使用 `undefined`。

```json
{ "@typescript-eslint/no-invalid-void-type": "error" }
```

```ts
// good
type NoOp = () => void;

function noop(): void {}

async function promiseMeSomething(): Promise<void> {}

```

```ts
// bad
type PossibleValues = string | number | void;

function logSomething(thing: void) {}

function printArg<T = void>(arg: T) {}

interface Interface {
  prop: void;
}
```

### [推荐] 任意键值对象统一使用 Record 定义

ESLint: `@typescript-eslint/consistent-indexed-object-style` · [官方文档](https://typescript-eslint.io/rules/consistent-indexed-object-style/)

定义任意键值对象可以用索引签名也可以用内置 `Record`，二者作用相同，统一使用 `Record` 更简洁一致。

```json
{ "@typescript-eslint/consistent-indexed-object-style": ["warn", "record"] }
```

```ts
// good
type Foo = Record<string, unknown>;
```

```ts
// bad
interface Foo {
  [key: string]: unknown;
}

type Bar = {
  [key: string]: unknown;
};
```

### [推荐] 对象类型统一使用 interface 定义

ESLint: `@typescript-eslint/consistent-type-definitions` · [官方文档](https://typescript-eslint.io/rules/consistent-type-definitions/)

`type` 和 `interface` 都能定义对象类型，混用会降低可读性。约定：对象类型用 `interface`；非对象类型（原始类型、联合、交叉等）仍用 `type`。

```json
{ "@typescript-eslint/consistent-type-definitions": ["warn", "interface"] }
```

```ts
// good
type T = string; // 非对象类型可用 type

type Foo = string | object; // 混合类型可用 type

interface T2 {
  x: number;
}
```

```ts
// bad
type T = { x: number };
```

### [强制] 类的泛型参数写在构造器处

ESLint: `@typescript-eslint/consistent-generic-constructors` · [官方文档](https://typescript-eslint.io/rules/consistent-generic-constructors/)

类的泛型参数有「类型注解」和「构造函数注解」两种写法，统一使用构造函数注解有助于提升可读性，也避免重复书写。

```json
{ "@typescript-eslint/consistent-generic-constructors": ["error", "constructor"] }
```

```ts
// good
const map = new Map<string, number>();
const map2: Map<string, number> = new MyMap();
const set = new Set<string>();
```

```ts
// bad
const map: Map<string, number> = new Map();
const set: Set<string> = new Set();
```

### [强制] 使用函数类型而不是含调用签名的接口

ESLint: `@typescript-eslint/prefer-function-type` · [官方文档](https://typescript-eslint.io/rules/prefer-function-type/)

定义函数类型时，`() => string` 比 `{ (): string }` 更简洁明了。注意：含有多个调用签名（重载）或同时含其他属性的接口不受限制。

```json
{ "@typescript-eslint/prefer-function-type": "error" }
```

```ts
// good
type Example = () => string;

function foo(example: () => number): number {
  return example();
}

// 允许使用多个调用签名（重载）
interface Overloaded {
  (data: string): number;
  (id: number): string;
}
```

```ts
// bad
interface Example {
  (): string;
}

function foo(example: { (): number }): number {
  return example();
}
```

### [规范] 对象类型成员使用一致的分隔符

interface 和 type 的成员可以用分号、逗号或换行分隔，应在项目内保持统一。原来的 `member-delimiter-style` 属于已废弃的排版规则，本 Skill 不再生成对应 ESLint 配置，交由项目 Formatter 处理。

```ts
// good：本项目选择多行分号、单行逗号时
interface Foo {
  name: string;
  greet(): string;
}

interface Bar {
  name: string;
  greet(): string;
}
```

```ts
// bad：在同一个项目中混用不同约定
interface Foo {
  name: string
  greet(): string,
}
```

### [规范] 类型声明前后空格保持一致

类型标注的空格风格统一可以提高可读性。原来的 `type-annotation-spacing` 属于已废弃的排版规则，本 Skill 不再生成对应 ESLint 配置，交由项目 Formatter 处理。

```ts
// good：冒号前不加空格、冒号后加一个空格时
const foo = 'bar';
const fn: () => string = () => 'bar';
```

```ts
// bad
const foo:string = 'bar';
const fn: () => string = ()=>'bar';
```

### [强制] 重载函数/方法的声明放在一起

ESLint: `@typescript-eslint/adjacent-overload-signatures` · [官方文档](https://typescript-eslint.io/rules/adjacent-overload-signatures/)

当一个函数或方法有多个类型重载时，放在一起便于阅读时判断一个函数全部的重载方式。规范版「接口中同一函数重载的类型声明需相邻」与本规则等价，以本规则为准。

```json
{ "@typescript-eslint/adjacent-overload-signatures": "error" }
```

```ts
// good
interface Foo {
  foo(s: string): void;
  foo(n: number): void;
  foo(sn: string | number): void;
  bar(): void;
}

export function bar(): void;
export function foo(s: string): void;
export function foo(n: number): void;
export function foo(sn: string | number): void;
```

```ts
// bad
interface Foo {
  foo(s: string): void;
  bar(): void;
  foo(n: number): void;
  foo(sn: string | number): void;
}

export function foo(s: string): void;
export function bar(): void;
export function foo(n: number): void;
```

### [强制] 禁止在函数调用时使用 any 类型的参数

ESLint: `@typescript-eslint/no-unsafe-argument` · [官方文档](https://typescript-eslint.io/rules/no-unsafe-argument/)

函数调用时传入 `any` 类型（包括含 `any` 元素的数组/元组、传给泛型参数的 `any`）会绕过类型检查，产生潜在安全漏洞。注意：把 `any` 传给声明为 `unknown` 的形参是允许的。

```json
{ "@typescript-eslint/no-unsafe-argument": "error" }
```

```ts
// good
declare function foo(arg1: string, arg2: number, arg3: string): void;

foo('a', 1, 'b');

const tuple1 = ['a', 1, 'b'] as const;
foo(...tuple1);

declare function bar(arg1: unknown, arg2: Set<unknown>, arg3: unknown[]): void;
bar(1, new Set<unknown>(), []); // 形参是 unknown，允许安全值传入
```

```ts
// bad
declare function foo(arg1: string, arg2: number, arg3: string): void;

const anyTyped = 1 as any;
foo(anyTyped, 1, 'a');

const anyArray: any[] = [];
foo(...anyArray);

const tuple1 = ['a', anyTyped, 'b'] as const;
foo(...tuple1);
```

### [强制] 禁止使用不安全的赋值

ESLint: `@typescript-eslint/no-unsafe-assignment` · [官方文档](https://typescript-eslint.io/rules/no-unsafe-assignment/)

不允许把 `any` 赋值给变量、把 `any[]` 赋值给数组；泛型位置同样检查，例如把 `Set<any>` 赋值给声明为 `Set<string>` 的变量会报错。赋值目标是 `unknown` 时除外。

```json
{ "@typescript-eslint/no-unsafe-assignment": "error" }
```

```ts
// good
const x = 1;
const [y] = [1];

function foo(a = 1) {}

class Foo {
  constructor(private readonly a = 1) {}
}

const set: Set<string> = new Set<string>();
const nested: Set<Set<Set<string>>> = new Set<Set<Set<string>>>();
```

```ts
// bad
const x = 1 as any;
const [y] = [] as any[];

function foo(a = 1 as any) {}

class Foo {
  private a = 1 as any;
}

const set: Set<string> = new Set<any>();
const nested: Set<Set<Set<string>>> = new Set<Set<Set<any>>>();
```

### [强制] 禁止调用 any 类型的值

ESLint: `@typescript-eslint/no-unsafe-call` · [官方文档](https://typescript-eslint.io/rules/no-unsafe-call/)

不允许调用类型为 `any` 的值（包括函数调用、new、模板字符串标签调用），因为 `any` 会跳过全部类型检查。

```json
{ "@typescript-eslint/no-unsafe-call": "error" }
```

```ts
// good
declare const typedVar: () => void;
declare const typedNested: { prop: { a: () => void } };

typedVar();
typedNested.prop.a();
(() => {})();
new Map();
String.raw`foo`;
```

```ts
// bad
declare const anyVar: any;
declare const nestedAny: { prop: any };

anyVar();
anyVar.a.b();
nestedAny.prop();
nestedAny.prop['a']();
new anyVar();
anyVar`foo`;
```

### [强制] 禁止不安全的声明合并

ESLint: `@typescript-eslint/no-unsafe-declaration-merging` · [官方文档](https://typescript-eslint.io/rules/no-unsafe-declaration-merging/)

TypeScript 支持同名声明合并，但类和接口之间的合并不安全：编译器不会检查属性是否真正初始化，运行时会出错。

```json
{ "@typescript-eslint/no-unsafe-declaration-merging": "error" }
```

```ts
// good
interface Foo {
  nums: number[];
}

class Bar implements Foo {
  nums: number[] = [];
}
```

```ts
// bad
interface Foo {
  nums: number[];
}

class Foo {}

const foo = new Foo();
foo.nums.push(1); // 运行时错误：nums 未被初始化
```

### [强制] 禁止访问 any 类型的成员

ESLint: `@typescript-eslint/no-unsafe-member-access` · [官方文档](https://typescript-eslint.io/rules/no-unsafe-member-access/)

不允许访问 `any` 类型值的成员（点访问、计算键访问都包含），用 `any` 作下标访问数组同样不安全。

```json
{ "@typescript-eslint/no-unsafe-member-access": "error" }
```

```ts
// good
declare const properlyTyped: { prop: { a: string } };

properlyTyped.prop.a;
properlyTyped.prop['a'];

const key = 'a';
properlyTyped.prop[key];

const arr = [1, 2, 3];
arr[1];
```

```ts
// bad
declare const anyVar: any;
declare const nestedAny: { prop: any };

anyVar.a;
anyVar.a.b;
nestedAny.prop.a;
nestedAny.prop['a'];

const arr = [1, 2, 3];
arr[anyVar]; // 用 any 作下标同样不安全
```

### [强制] 禁止函数返回 any 或 any[]

ESLint: `@typescript-eslint/no-unsafe-return` · [官方文档](https://typescript-eslint.io/rules/no-unsafe-return/)

不允许函数返回 `any` 或 `any[]`；泛型位置也会检查，例如声明返回 `Set<string>` 实际返回 `Set<any>` 会报错。声明返回 `unknown` 时返回 `any` 是允许的。

```json
{ "@typescript-eslint/no-unsafe-return": "error" }
```

```ts
// good
function foo1() {
  return 1;
}

const foo2 = () => ['a'];

function assignability(): Set<string> {
  return new Set<string>(['foo']);
}

// 返回类型声明为 unknown 时可以返回 any
function parse(json: string): unknown {
  return JSON.parse(json);
}
```

```ts
// bad
function foo1() {
  return 1 as any;
}

const foo2 = () => Object.create(null);

function foo3() {
  return [] as any[];
}

function assignability(): Set<string> {
  return new Set<any>([1]);
}
```

### [推荐] 避免不必要的类型参数

ESLint: `@typescript-eslint/no-unnecessary-type-arguments` · [官方文档](https://typescript-eslint.io/rules/no-unnecessary-type-arguments/)

定义函数、接口、类时可以给类型参数指定默认值（如 `function f<T = number>(...)`），使用时如果显式传入的实参等于默认值，就无需再写。

```json
{ "@typescript-eslint/no-unnecessary-type-arguments": "warn" }
```

```ts
// good
class C<T = number> {
  value?: T;
}
new C();

// 指定为非默认值 string 是有必要的
new C<string>();
class D extends C<string> {}
```

```ts
// bad
class C<T = number> {}
new C<number>(); // 等于默认值，无需指定
class D extends C<number> {}

interface I<T = number> {}
class Impl implements I<number> {}
```

### [强制] 禁止不必要的类型约束

ESLint: `@typescript-eslint/no-unnecessary-type-constraint` · [官方文档](https://typescript-eslint.io/rules/no-unnecessary-type-constraint/)

泛型参数不写 `extends` 时默认就是 `extends any`，手动写 `extends any` 是多余的。

```json
{ "@typescript-eslint/no-unnecessary-type-constraint": "error" }
```

```ts
// good
interface Foo<T> {
  value: T;
}
interface Bar<T> {
  value: T;
}
class Baz<T> {
  qux<U>(value: U): U {
    return value;
  }
}
const quux = <T>(value: T): T => value;
```

```ts
// bad
interface FooAny<T extends any> {}
type BarAny<T extends any> = {};
class BazAny<T extends any> {
  quxAny<U extends any>() {}
}
const QuuxAny = <T extends any>() => {};
```

### [强制] 禁止空对象类型和无成员接口

ESLint: `@typescript-eslint/no-empty-object-type` · [官方文档](https://typescript-eslint.io/rules/no-empty-object-type/)

`{}` 表示任何非 null/undefined 值，并不表示“空对象”；无成员接口也没有表达契约。需要对象值时使用精确类型、`object` 或 `Record<string, unknown>`，需要扩展现有接口时按规则配置保留有意义的继承形式。

```json
{ "@typescript-eslint/no-empty-object-type": "error" }
```

```ts
// good
interface ButtonProps {
  label: string;
}

type AnyObject = Record<string, unknown>;
```

```ts
// bad
interface ButtonProps {}
type AnyObject = {};
```
