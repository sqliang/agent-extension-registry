# 条件与循环规范

本文件覆盖条件判断与循环相关规则：`for-of` 优先、switch 穷尽检查、不必要条件/布尔比较/限定符、`+` 与模板字符串的类型限制、`toString` 安全调用、`this` 别名，以及 `===`/`!==`、`Object.keys` 遍历、避免 `return undefined` 的规范。

### [推荐] 索引仅用于取数组当前项时使用 for-of 循环

ESLint: `@typescript-eslint/prefer-for-of` · [官方文档](https://typescript-eslint.io/rules/prefer-for-of/)

很多标准 `for` 循环的索引 `i` 只是用来访问 `array[i]`，这种情况下 `for-of` 读写都更容易。如果循环体确实用到了索引本身，则不必改写。规范版「索引仅用于获取数组当前被迭代的项时，使用 for..of 遍历数组」与本规则一致。

```json
{ "@typescript-eslint/prefer-for-of": "warn" }
```

```ts
// good
declare const array: string[];

for (const x of array) {
  console.log(x);
}

for (let i = 0; i < array.length; i++) {
  // 使用到了 i 本身，可以不用 for-of
  console.log(i, array[i]);
}
```

```ts
// bad
declare const array: string[];

for (let i = 0; i < array.length; i++) {
  console.log(array[i]); // i 仅用于取元素，应改为 for-of
}
```

### [推荐] switch-case 覆盖联合类型的所有场景

ESLint: `@typescript-eslint/switch-exhaustiveness-check` · [官方文档](https://typescript-eslint.io/rules/switch-exhaustiveness-check/)

联合类型常用于描述 `switch` 的所有 case 场景，但联合类型变化后容易忘记补 case。此规则在缺少 `default` 且未穷举所有类型成员时报错。

```json
{ "@typescript-eslint/switch-exhaustiveness-check": "warn" }
```

```ts
// good
type Day = 'Monday' | 'Tuesday';

declare const day: Day;
let result = 0;

switch (day) {
  case 'Monday':
    result = 1;
    break;
  case 'Tuesday':
    result = 2;
    break;
}
```

```ts
// bad
type Day = 'Monday' | 'Tuesday';

declare const day: Day;
let result = 0;

switch (day) {
  case 'Monday':
    result = 1;
    break;
  // 缺少 'Tuesday' 分支，也没有 default
}
```

### [推荐] 避免不必要的条件判断

ESLint: `@typescript-eslint/no-unnecessary-condition` · [官方文档](https://typescript-eslint.io/rules/no-unnecessary-condition/)

如果根据类型就能推断出条件表达式恒真或恒假，这个判断就是不必要的。涉及 `&&`、`||`、`?:` 的操作数，`if`/`for`/`while`/`do-while` 的条件，以及可选链的基值。

```json
{ "@typescript-eslint/no-unnecessary-condition": "warn" }
```

```ts
// good
function head<T>(items: T[]) {
  // items 有可能是空数组，判断是有必要的
  if (items.length) {
    return items[0].toUpperCase();
  }
}

function foo(arg: string) {
  // arg 有可能是空字符串，判断是有必要的
  if (arg) {
    // ...
  }
}
```

```ts
// bad
function foo(arg: 'bar' | 'baz') {
  // arg 不可能为 null/undefined/空字符串，判断是多余的
  if (arg) {
    // ...
  }
}

function bar(arg: string) {
  // arg 不可能为空，?. 是多余的
  return arg?.length;
}
```

### [推荐] 不使用不必要的布尔字面量进行比较

ESLint: `@typescript-eslint/no-unnecessary-boolean-literal-compare` · [官方文档](https://typescript-eslint.io/rules/no-unnecessary-boolean-literal-compare/)

当变量只可能是 `boolean` 时，直接用变量本身（或其取反）做判断更简洁；只有当类型是包含布尔的联合类型时，与 `true`/`false` 比较才有意义。

```json
{ "@typescript-eslint/no-unnecessary-boolean-literal-compare": "warn" }
```

```ts
// good
declare const someCondition: boolean;
if (someCondition) {
  // ...
}

declare const someObjectBoolean: boolean | Record<string, unknown>;
if (someObjectBoolean === true) {
  // 联合类型场景，与 true 比较是有意义的
}
```

```ts
// bad
declare const someCondition: boolean;
if (someCondition === true) {
  // someCondition 只可能是 boolean，=== true 多余
}
```

### [推荐] 避免不必要的限定符

ESLint: `@typescript-eslint/no-unnecessary-qualifier` · [官方文档](https://typescript-eslint.io/rules/no-unnecessary-qualifier/)

枚举和命名空间的成员通常以 `Enum.member` 方式访问，但在其内部访问自己的成员时不需要加限定符。

```json
{ "@typescript-eslint/no-unnecessary-qualifier": "warn" }
```

```ts
// good
enum A {
  B,
  C = B, // 内部直接访问 B
}
```

```ts
// bad
enum A {
  B,
  C = A.B, // 在枚举 A 内部无需写 A.
}

namespace NS {
  export type T = number;
  const x: NS.T = 3; // 在命名空间 NS 内部无需写 NS.
}
```

### [强制] 限制加号运算符的操作值类型

ESLint: `@typescript-eslint/restrict-plus-operands` · [官方文档](https://typescript-eslint.io/rules/restrict-plus-operands/)

`+` 运算符允许对任意两个值相加，但两个不同类型的原始值相加很容易得到意外结果（如 `'5.5' + 5`）。约定：两边类型必须一致且为 `bigint`/`number`/`string`，不允许 `any`。

```json
{
  "@typescript-eslint/restrict-plus-operands": [
    "error",
    { "checkCompoundAssignments": false, "allowAny": false }
  ]
}
```

```ts
// good
var foo = parseInt('5.5', 10) + 10;
var foo = 1n + 1n;
var foo = 'a' + 'b';
```

```ts
// bad
var foo = '5.5' + 5; // string + number
var foo = 1n + 1; // bigint + number
var fn = (a: any, b: string) => a + b; // allowAny: false，不允许 any
```

### [强制] 模板字符串中只允许安全的类型

ESLint: `@typescript-eslint/restrict-template-expressions` · [官方文档](https://typescript-eslint.io/rules/restrict-template-expressions/)

模板字符串会隐式调用 `toString()`，对象的默认结果是 `"[object Object]"`，通常不符合预期。约定：允许 `number`、`boolean`、正则，不允许 `any`、`null`/`undefined` 等。

```json
{
  "@typescript-eslint/restrict-template-expressions": [
    "error",
    {
      "allowNumber": true,
      "allowBoolean": true,
      "allowAny": false,
      "allowNullish": false,
      "allowRegExp": true
    }
  ]
}
```

```ts
// good
const arg = 'foo';
const msg1 = `arg = ${arg}`;

const stringWithKindProp: string & { _kind?: 'MyString' } = 'foo';
const msg2 = `stringWithKindProp = ${stringWithKindProp}`;
```

```ts
// bad
const arg1 = [1, 2];
const msg1 = `arg1 = ${arg1}`; // 数组会被拼成 "1,2"，多半不是预期

declare const obj: object;
const msg2 = `obj = ${obj}`; // "[object Object]"
```

### [建议] toString 只在提供有用信息的对象上调用

ESLint: `@typescript-eslint/no-base-to-string` · [官方文档](https://typescript-eslint.io/rules/no-base-to-string/)

对象的默认 `toString()` 返回 `"[object Object]"`，是没有信息量的无用值。未自定义 `toString` 的对象，不应通过 `+` 或 `${}` 触发隐式字符串化。

```json
{ "@typescript-eslint/no-base-to-string": "warn" }
```

```ts
// good
'Text:' + true; // 原始类型的 toString 可用
`Value: ${123}`;
`Arrays: ${[1, 2, 3]}`;

// 自定义了有用的 toString
const objectToString = {
  toString: () => 'Hello, world!',
};
`Object: ${objectToString}`;
```

```ts
// bad
'' + {};
({}).toString();

class ObjectNoToString {}
new ObjectNoToString() + ''; // "[object Object]"
```

### [推荐] 不为 this 设置别名

ESLint: `@typescript-eslint/no-this-alias` · [官方文档](https://typescript-eslint.io/rules/no-this-alias/)

把 `this` 赋给变量（`const self = this`）是箭头函数出现之前的写法。在非 ES5 遗留项目中出现这种写法，通常意味着作用域管理出了问题，应改用箭头函数。

```json
{ "@typescript-eslint/no-this-alias": "warn" }
```

```ts
// good
setTimeout(() => {
  this.doWork();
});
```

```ts
// bad
const self = this;
setTimeout(function () {
  self.doWork();
});
```

### [强制] 使用 === 或 !== 判断相等性

`==`/`!=` 会进行隐式类型转换，结果经常违背直觉（如 `'' == 0` 为 true）。一律使用严格相等；判断「非 null 且非 undefined」时显式写出两个条件，语义更清晰。

```ts
// good
if (foo !== null && foo !== undefined) {
  // ...
}
```

```ts
// bad
if (foo != null) {
  // ...
}
```

### [建议] 使用 Object.keys/values/entries 遍历对象，不用 for-in

`for-in` 会遍历原型链上的可枚举属性，需要额外 `hasOwnProperty` 判断；`Object.keys`/`Object.values`/`Object.entries`/`Object.getOwnPropertyNames` 只返回自身属性，语义明确。

```ts
// good
Object.keys(obj).forEach(key => {
  /* ... */
});
```

```ts
// bad
for (const key in obj) {
  if (obj.hasOwnProperty(key)) {
    // ...
  }
}
```

### [强制] 避免 return undefined，应直接 return

`return undefined` 会给调用方「这个函数有实际返回值」的错觉，直接 `return` 更清晰。

```ts
// good
function foo(bar: boolean) {
  if (!bar) {
    return;
  }
}
```

```ts
// bad
function foo(bar: boolean) {
  if (!bar) {
    return undefined;
  }
}
```
