# 数组与对象规范

本文件覆盖数组与对象操作相关规则：禁 `delete` 计算键、禁 `for-in` 遍历数组、`includes` 替代 `indexOf`、`startsWith`/`endsWith`，以及 `...` 展开做浅拷贝和类数组转换的规范。

### [推荐] 禁止对计算键表达式使用 delete 运算符

ESLint: `@typescript-eslint/no-dynamic-delete` · [官方文档](https://typescript-eslint.io/rules/no-dynamic-delete/)

对计算出来的键使用 `delete` 容易删掉错误的属性（例如键名为 `hasOwnProperty` 的边界情况）。如果要存储动态的键值集合，考虑使用 `Map` 或 `Set`。

```json
{ "@typescript-eslint/no-dynamic-delete": "warn" }
```

```ts
// good
const container: { [i: string]: number } = {
  /* ... */
};

delete container.aaa;
delete container[7];
```

```ts
// bad
const container: { [i: string]: number } = {
  /* ... */
};

const name = 'name';
delete container[name];
delete container[name.toUpperCase()];
```

### [强制] 禁止使用 for-in 循环遍历数组

ESLint: `@typescript-eslint/no-for-in-array` · [官方文档](https://typescript-eslint.io/rules/no-for-in-array/)

`for-in` 是为遍历对象属性设计的：它把数组索引当作字符串迭代，还会省略数组中的「空洞」。遍历数组应使用 `for-of`、`forEach` 或标准 `for` 循环。

```json
{ "@typescript-eslint/no-for-in-array": "error" }
```

```ts
// good
declare const array: string[];

for (const value of array) {
  console.log(value);
}

for (let i = 0; i < array.length; i += 1) {
  console.log(i, array[i]);
}

array.forEach((value, i) => {
  console.log(i, value);
});
```

```ts
// bad
declare const array: string[];

for (const i in array) {
  console.log(array[i]); // i 是字符串索引
}
```

### [推荐] 使用 includes 替代 indexOf 判断存在性

ESLint: `@typescript-eslint/prefer-includes` · [官方文档](https://typescript-eslint.io/rules/prefer-includes/)

ES2015 之前只能用 `indexOf(...) !== -1` 判断数组/字符串中是否存在某个值；`String#includes`（ES2015）和 `Array#includes`（ES2016）语义更直接、可读性更好，也推荐替代简单的正则校验。注意：自定义对象的 `indexOf` 和 `includes` 入参类型不一致时本规则不适用。

```json
{ "@typescript-eslint/prefer-includes": "warn" }
```

```ts
// good
declare const str: string;
declare const array: string[];
declare const value: string;

str.includes(value);
array.includes(value);
```

```ts
// bad
declare const str: string;
declare const array: string[];
declare const value: string;

str.indexOf(value) !== -1;
array.indexOf(value) !== -1;
/example/.test(str);
```

### [推荐] 优先使用 String#startsWith 和 String#endsWith

ESLint: `@typescript-eslint/prefer-string-starts-ends-with` · [官方文档](https://typescript-eslint.io/rules/prefer-string-starts-ends-with/)

判断字符串是否以特定字符串开头或结尾，`startsWith`/`endsWith` 比 `indexOf === 0`、`slice` 比较、正则等方式更清晰。

```json
{ "@typescript-eslint/prefer-string-starts-ends-with": "warn" }
```

```ts
// good
declare const foo: string;

foo.startsWith('bar');
foo.endsWith('bar');
```

```ts
// bad
declare const foo: string;

// starts with
foo.indexOf('bar') === 0;
foo.slice(0, 3) === 'bar';
/^bar/.test(foo);

// ends with
foo[foo.length - 1] === 'b';
foo.lastIndexOf('bar') === foo.length - 3;
```

### [建议] 使用 ... 进行数组浅拷贝

展开运算符做浅拷贝比 `Array.from`/`slice` 更直观，更不要手写循环逐项 push。

```ts
// good
const copies = [...items];
```

```ts
// bad
const copies = items.slice();

// worst
let copies = [];
for (let i = 0; i < items.length; i++) {
  copies.push(items[i]);
}
```

### [建议] 使用 ... 将类数组对象转化为数组

把 `NodeList`、`arguments` 等类数组对象转成真正的数组时，展开运算符比 `Array.from`、`Array.prototype.slice.call` 更简洁。

```ts
// good
const elements = [...document.querySelectorAll('.foo')];
```

```ts
// bad
const elements = Array.from(document.querySelectorAll('.foo'));

// worst
const elements = Array.prototype.slice.call(document.querySelectorAll('.foo'));
```

### [强制] 使用 ... 进行对象浅拷贝，不用 Object.assign

展开运算符做对象浅拷贝/合并是不可变更新（如 `setState`）的惯用写法，比 `Object.assign` 更易读，也不会意外修改第一个参数。

```ts
// good
this.setState(state => ({ ...state, clicked: true }));
```

```ts
// bad
this.setState(state => Object.assign({}, state, { clicked: true }));
```
