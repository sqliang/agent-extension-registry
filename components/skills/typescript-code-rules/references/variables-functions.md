# 变量与函数规范

本文件覆盖变量声明、默认参数、剩余参数、解构、箭头函数和函数设计。行数与参数数量只作为复杂度信号，不作为脱离上下文的机械门槛。

### [强制] 使用 let 和 const，不使用 var

ESLint: `no-var` · [官方文档](https://eslint.org/docs/latest/rules/no-var)

`let` 和 `const` 具有块级作用域，能避免 `var` 的函数作用域和重复声明带来的歧义。迁移遗留代码时应同时检查声明提升依赖，而不是只做文本替换。

```json
{ "no-var": "error" }
```

```ts
// good
let completedCount = 0;
completedCount += 1;
const maxRetries = 3;
```

```ts
// bad
var completedCount = 0;
var maxRetries = 3;
```

### [强制] 不再重新赋值的变量使用 const

ESLint: `prefer-const` · [官方文档](https://eslint.org/docs/latest/rules/prefer-const)

`const` 固定的是变量绑定，不代表对象深度不可变。声明后不再重新赋值时使用 `const`；需要重新赋值时使用 `let`。

```json
{ "prefer-const": "error" }
```

```ts
// good
const endpoint = '/users';
let retryCount = 0;
retryCount += 1;
```

```ts
// bad
let endpoint = '/users';
```

### [规范] 变量在靠近首次使用的位置声明

缩小声明与使用之间的距离可以降低阅读和维护成本。不要为了把声明集中在函数顶部而扩大变量作用域，也不要为了短距离而重复执行昂贵计算。

```ts
// good
function renderUsers(users: User[]) {
  const activeUsers = users.filter(user => user.active);
  const labels = activeUsers.map(user => user.name);
  return labels;
}
```

```ts
// bad
function renderUsers(users: User[]) {
  const activeUsers = users.filter(user => user.active);
  const unrelatedWork = loadConfiguration();
  const labels = activeUsers.map(user => user.name);
  return { labels, unrelatedWork };
}
```

### [规范] 使用默认参数表达缺省值

只有参数为 `undefined` 时才应应用默认值，优先使用默认参数语法。若 `null`、空字符串或 `0` 也需要替换，应显式表达业务条件，不要依赖 `||` 的隐式假值语义。

```ts
// good
function createPage(title = 'Untitled', size = 20) {
  return { title, size };
}
```

```ts
// bad
function createPage(title?: string, size?: number) {
  title = title || 'Untitled';
  size = size || 20;
  return { title, size };
}
```

### [强制] 使用剩余参数替代 arguments

ESLint: `prefer-rest-params` · [官方文档](https://eslint.org/docs/latest/rules/prefer-rest-params)

剩余参数是真正的数组，具有明确的类型和参数位置；`arguments` 不是数组，还会混淆参数映射和 `this` 语义。

```json
{ "prefer-rest-params": "error" }
```

```ts
// good
function sum(...values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}
```

```ts
// bad
function sum() {
  return Array.from(arguments).reduce((total, value) => total + value, 0);
}
```

### [规范] 解构保持扁平且以减少中间变量为目的

解构用于直接表达数据形状和减少中间变量。避免三层及以上的嵌套解构，也不要对随即可以分别声明的字面量做无收益解构。

```ts
// good
const { firstName, lastName } = user;
const [primary, secondary] = colors;
```

```ts
// bad
const { profile: { contact: { email } } } = user;
const [primary, secondary] = ['red', 'blue'];
```

### [规范] 需要动态 this 的函数不使用箭头函数

箭头函数捕获定义位置的 `this`，适合回调和词法作用域；需要由调用方通过 `call`、`apply` 或方法调用决定 `this` 时，使用普通函数或方法定义。

```ts
// good
const formatter = {
  prefix: 'User',
  format(name: string) {
    return `${this.prefix}: ${name}`;
  },
};
```

```ts
// bad
const formatter = {
  prefix: 'User',
  format: (name: string) => `${this.prefix}: ${name}`,
};
```

### [规范] 多个配置开关使用有名称的 options 对象

多个布尔值或配置项连续出现时，调用点会失去语义。使用有类型的 options 对象表达配置；核心数据输入仍可作为独立参数。

```ts
// good
interface RemoveOptions {
  removeListeners?: boolean;
  detachChildren?: boolean;
}

function removeElement(element: HTMLElement, options: RemoveOptions = {}) {
  // ...
}

removeElement(element, { removeListeners: true });
```

```ts
// bad
removeElement(element, true, false);
```

### [规范] 函数保持单一职责，行数与参数数仅作复杂度信号

函数应围绕一个可命名的逻辑单元组织。约 50 行或 6 个参数可以作为 Review 提示，但不是自动失败条件；应结合嵌套深度、职责数量、参数语义和测试难度判断是否拆分。

```ts
// good
function syncViewState(state: ViewState) {
  syncSelection(state);
  syncAvailability(state);
}
```

```ts
// bad
function syncViewState(state: ViewState) {
  // 同时处理选择、权限、网络请求、日志和页面导航，主线难以辨认。
}
```
