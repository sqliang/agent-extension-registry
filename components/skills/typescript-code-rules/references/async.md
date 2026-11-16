# 异步与 Promise 规范

本文件覆盖异步与 Promise：禁 `await` 非 thenable 值、漂浮 Promise、Promise 误用、void 表达式、`async/await` 风格，以及独立 IO 的并发和 Promise 组合器选择。

### [强制] 禁止 await 非 thenable 的值

ESLint: `@typescript-eslint/await-thenable` · [官方文档](https://typescript-eslint.io/rules/await-thenable/)

`await` 一个不带 `then` 方法的值（thenable，比如 Promise）没有任何效果，通常是书写失误——要么忘了把函数标成 `async`，要么 `await` 写错了位置。

```json
{ "@typescript-eslint/await-thenable": "error" }
```

```ts
// good
await Promise.resolve('value');

const createValue = async () => 'value';
await createValue();
```

```ts
// bad
await 'value';

const createValue = () => 'value';
await createValue(); // createValue 不是 async 函数，返回值不是 Promise
```

### [推荐] 要求适当处理 Promise 语句

ESLint: `@typescript-eslint/no-floating-promises` · [官方文档](https://typescript-eslint.io/rules/no-floating-promises/)

「漂浮」Promise 指创建后没有任何代码处理它的结果或错误，会导致操作顺序不正确、reject 被静默吞掉等问题。有效的处理方式包括：`await`、`return`、`then()` 传两个参数、`catch()` 处理、`void` 显式丢弃。

```json
{ "@typescript-eslint/no-floating-promises": "warn" }
```

```ts
// good
const promise = new Promise<string>((resolve) => {
  resolve('value');
});
await promise;

async function returnsPromise() {
  return 'value';
}

returnsPromise().then(
  () => {},
  () => {},
);

Promise.reject('value').catch(() => {});
Promise.reject('value').catch(() => {}).finally(() => {});
```

```ts
// bad
const promise = new Promise<string>((resolve) => resolve('value'));
promise; // 漂浮：没有任何处理

async function returnsPromise() {
  return 'value';
}

returnsPromise().then(() => {}); // 缺少 reject 处理

Promise.reject('value').catch(); // catch 没有参数等于没处理
```

### [强制] 不允许在条件判断等不适合的位置使用 Promise

ESLint: `@typescript-eslint/no-misused-promises` · [官方文档](https://typescript-eslint.io/rules/no-misused-promises/)

Promise 对象永远是真值，直接放进 `if`/三元/`while` 条件里永远是 true，通常是漏写了 `await`。本规则检测「Promise 用在错误的逻辑位置」；检测「未处理的 Promise 语句」请看 `no-floating-promises`。

```json
{ "@typescript-eslint/no-misused-promises": "error" }
```

```ts
// good
const promise = Promise.resolve('value');

// 条件判断中总是先 await
if (await promise) {
  // ...
}

const val = (await promise) ? 123 : 456;

while (await hasMore()) {
  await processNext();
}
```

```ts
// bad
const promise = Promise.resolve('value');

if (promise) {
  // promise 恒为真值，条件永远成立
}

const val = promise ? 123 : 456;

while (promise) {
  // 死循环
}
```

### [强制] void 类型的表达式只能出现在语句位置

ESLint: `@typescript-eslint/no-confusing-void-expression` · [官方文档](https://typescript-eslint.io/rules/no-confusing-void-expression/)

把 `void` 类型（无返回值）的表达式的结果拿来使用，会制造「函数有返回值」的错觉。例如 `return console.error(...)`、把 `alert(...)` 的结果赋给变量、在 Promise 链的箭头函数中隐式返回无关值。

```json
{ "@typescript-eslint/no-confusing-void-expression": "error" }
```

```ts
// good
alert('Hello, world!');

promise.then(
  value => {
    window.postMessage(value); // 用花括号包住，不隐式返回
  },
  () => {},
);

function doSomething() {
  if (!somethingToDo) {
    console.error('Nothing to do!');
    return;
  }
  console.log('Doing a thing...');
}

// 也可以用逻辑运算符明确表达意图
cond && console.log('true');
```

```ts
// bad
const response = alert('Are you sure?'); // alert 返回 void

promise.then(value => window.postMessage(value)); // 隐式返回了无关值

function doSomething() {
  if (!somethingToDo) {
    return console.error('Nothing to do!'); // 给人返回值的错觉
  }
  console.log('Doing a thing...');
}
```

### [强制] 不使用无意义的 void 运算符

ESLint: `@typescript-eslint/no-meaningless-void-operator` · [官方文档](https://typescript-eslint.io/rules/no-meaningless-void-operator/)

`void` 运算符用于显式丢弃一个值。如果表达式的类型本来就是 `void` 或 `undefined`，再用 `void` 包一层毫无意义。与 `no-unused-expressions` 搭配可统一风格：`void foo()` 总是表示丢弃返回值，`foo()` 从不丢弃。

```json
{ "@typescript-eslint/no-meaningless-void-operator": "error" }
```

```ts
// good
(() => {})();

function foo() {}
foo(); // 返回值本来就是 void，无需丢弃

function bar(x: number) {
  return x + 1;
}

void bar(1); // 显式丢弃一个 number 返回值
```

```ts
// bad
void (() => {})(); // IIFE 返回 void，void 多余

function foo() {}
void foo(); // foo 本来就返回 void，void 多余
```

### [规范] 异步流程优先使用 async/await 表达

顺序依赖、条件分支和错误处理较复杂时，`async/await` 通常比深层回调或 Promise 链更清晰。简单的一次性转换可直接返回 Promise，避免无意义的包装。

```ts
// good
async function loadReport(id: string) {
  try {
    const report = await fetchReport(id);
    if (!validateReport(report)) {
      throw new Error('Invalid report');
    }
    return validateReport(report);
  } catch {
    return false;
  }
}
```

```ts
// bad
function loadReport(id: string) {
  return fetchReport(id)
    .then(report => {
      if (!validateReport(report)) {
        return Promise.reject(new Error('Invalid report'));
      }
      return report;
    })
    .then(report => validateReport(report))
    .catch(() => false);
}
```

### [规范] 独立 IO 并发执行并按结果语义选择 Promise 组合器

没有数据依赖的 IO 不应仅为了书写方便而串行化。全部成功才有意义时使用 `Promise.all`；需要观察每个结果、允许部分失败时使用 `Promise.allSettled`。存在数据依赖、限流、事务顺序或共享资源约束时仍应串行或限制并发。

```ts
// good
const [tags, articles] = await Promise.all([
  requestTags(),
  requestArticles(),
]);

const results = await Promise.allSettled([
  requestPrimaryMirror(),
  requestSecondaryMirror(),
]);
```

```ts
// bad
const tags = await requestTags();
const articles = await requestArticles();
```
