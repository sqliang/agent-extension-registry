# 条件与循环规范

本文件覆盖条件、循环和动态代码：`for-of`、switch 穷尽、条件简化、`+` 与模板字符串类型限制、严格相等、花括号、提前返回、对象遍历，以及禁止 `eval`、隐式执行、`Function` 构造函数和 `with`。

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
function head(items: string[]) {
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
  B = 1,
  C = 2,
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
    {
      "skipCompoundAssignments": false,
      "allowAny": false,
      "allowBoolean": false,
      "allowNullish": false,
      "allowNumberAndString": false,
      "allowRegExp": false
    }
  ]
}
```

```ts
// good
const parsed = parseInt('5.5', 10) + 10;
const total = 1n + 1n;
const label = 'a' + 'b';
```

```ts
// bad
const label = '5.5' + 5; // string + number
const total = 1n + 1; // bigint + number
const fn = (a: any, b: string) => a + b; // allowAny: false，不允许 any
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
const count = 2;
const msg2 = `count = ${count}`;
```

```ts
// bad
const arg1 = [1, 2];
const msg1 = `arg1 = ${arg1}`; // 数组会被拼成 "1,2"，多半不是预期

declare const obj: object;
const msg2 = `obj = ${obj}`; // "[object Object]"
```

### [推荐] toString 只在提供有用信息的对象上调用

ESLint: `@typescript-eslint/no-base-to-string` · [官方文档](https://typescript-eslint.io/rules/no-base-to-string/)

对象的默认 `toString()` 返回 `"[object Object]"`，是没有信息量的无用值。未自定义 `toString` 的对象，不应通过 `+` 或 `${}` 触发隐式字符串化。

```json
{ "@typescript-eslint/no-base-to-string": "warn" }
```

```ts
// good
const text = `Text: ${true}`;
const value = `Value: ${123}`;
const arrays = `Arrays: ${[1, 2, 3].join(',')}`;

// 自定义了有用的 toString
const objectToString = {
  toString: () => 'Hello, world!',
};
const objectText = objectToString.toString();
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

### [强制] 使用 === 或 !== 判断相等性，不用 == 或 !=

ESLint: `eqeqeq` · [官方文档](https://eslint.org/docs/latest/rules/eqeqeq)

`==`/`!=` 会进行隐式类型转换，结果经常违背直觉（如 `'' == 0` 为 true）。一律使用严格相等；判断「非 null 且非 undefined」时显式写出两个条件，语义更清晰。

```json
{ "eqeqeq": ["error", "always"] }
```

```ts
// good
function hasValue(foo: string | null | undefined) {
  return foo !== null && foo !== undefined;
}
```

```ts
// bad
if (foo != null) {
  // ...
}
```

### [规范] 使用 Object.keys/values/entries 遍历对象，不用 for-in

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

### [规范] 避免 return undefined，应直接 return

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

### [强制] 控制语句始终使用花括号

ESLint: `curly` · [官方文档](https://eslint.org/docs/latest/rules/curly)

即使控制语句只有一行，也使用块语句，避免后续追加语句时改变控制流。

```json
{ "curly": ["error", "all"] }
```

```ts
// good
if (ready) {
  start();
}
```

```ts
// bad
if (ready) start();
```

### [推荐] 提前返回后省略多余 else

ESLint: `no-else-return` · [官方文档](https://eslint.org/docs/latest/rules/no-else-return)

分支已经 `return`、`throw` 或结束时，后续逻辑放到外层可以减少嵌套并突出主流程。保留 else 能显著表达对称业务分支时，可结合上下文判断。

```json
{ "no-else-return": "warn" }
```

```ts
// good
function getName(user: { name: string } | null) {
  if (!user) {
    return 'anonymous';
  }
  return user.name;
}
```

```ts
// bad
if (!user) {
  return 'anonymous';
} else {
  return user.name;
}
```

### [强制] 禁止直接调用 eval

ESLint: `no-eval` · [官方文档](https://eslint.org/docs/latest/rules/no-eval)

`eval` 会在运行时执行字符串并访问局部作用域，带来安全和可维护性风险。使用数据解析、显式映射或普通函数替代。

```json
{ "no-eval": "error" }
```

```ts
// good
const value: unknown = JSON.parse(input);
```

```ts
// bad
const value = eval(input);
```

### [强制] 禁止通过字符串隐式执行代码

ESLint: `@typescript-eslint/no-implied-eval` · [官方文档](https://typescript-eslint.io/rules/no-implied-eval/)

不要把字符串传给 `setTimeout`、`setInterval` 等会执行代码的 API；传入函数并显式声明参数。使用类型感知扩展规则，以覆盖 TypeScript 项目中的全局及对象方法调用。

```json
{ "@typescript-eslint/no-implied-eval": "error" }
```

```ts
// good
setTimeout(() => {
  refresh();
}, 100);
```

```ts
// bad
setTimeout('refresh()', 100);
```

### [强制] 禁止使用 Function 构造函数动态执行代码

ESLint: `no-new-func` · [官方文档](https://eslint.org/docs/latest/rules/no-new-func)

`new Function` 与 `eval` 一样会执行动态字符串。即使它使用全局作用域，也不能消除注入和审计风险。

```json
{ "no-new-func": "error" }
```

```ts
// good
const add = (left: number, right: number) => left + right;
```

```ts
// bad
const add = new Function('left', 'right', 'return left + right');
```

### [强制] 禁止使用 with 语句

ESLint: `no-with` · [官方文档](https://eslint.org/docs/latest/rules/no-with)

`with` 使标识符解析依赖运行时对象，破坏静态可读性，并在严格模式下不可用。使用局部变量或显式属性访问替代。

```json
{ "no-with": "error" }
```

```ts
// good
const { x, y } = point;
```

```ts
// bad
with (point) {
  console.log(x, y);
}
```

### [规范] 使用 String、Number、Boolean 表达显式类型转换

类型转换应让意图清晰可见，不使用 `+ ''`、一元 `+` 或 `!!` 作为团队默认写法。转换失败、空值和 `NaN` 等边界必须按业务语义处理。

```ts
// good
const label = String(value);
const count = Number(input);
const enabled = Boolean(input);
```

```ts
// bad
const label = value + '';
const count = +input;
const enabled = !!input;
```
