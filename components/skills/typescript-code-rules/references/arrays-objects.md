# 数组与对象规范

本文件覆盖数组与对象操作：`delete`、`for-in`、`includes`、字符串边界判断、浅拷贝、字面量、方法简写、计算属性、`Map`/`Set`、原型保护和外部输入不可变更新。

### [推荐] 禁止对计算键表达式使用 delete 运算符

ESLint: `@typescript-eslint/no-dynamic-delete` · [官方文档](https://typescript-eslint.io/rules/no-dynamic-delete/)

对计算出来的键使用 `delete` 容易删掉错误的属性（例如键名为 `hasOwnProperty` 的边界情况）。如果要存储动态的键值集合，考虑使用 `Map` 或 `Set`。

```json
{ "@typescript-eslint/no-dynamic-delete": "warn" }
```

```ts
// good
const container: Record<string, number> = {
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

### [规范] 使用 ... 进行数组浅拷贝，不用 Array.from/slice

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

### [规范] 使用 ... 将可迭代集合转化为数组

把 `NodeList` 等可迭代集合转成真正的数组时，展开运算符比 `Array.from`、`Array.prototype.slice.call` 更简洁。只具备 `length` 和索引、未实现 `Symbol.iterator` 的类数组对象应使用 `Array.from`；`arguments` 按剩余参数规则处理。

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

### [规范] 使用 ... 进行对象浅拷贝，不用 Object.assign

展开运算符做对象浅拷贝/合并是不可变更新（如 `setState`）的惯用写法，比 `Object.assign` 更易读，也不会意外修改第一个参数。

```ts
// good
this.setState(state => ({ ...state, clicked: true }));
```

```ts
// bad
this.setState(state => Object.assign({}, state, { clicked: true }));
```

### [规范] 使用数组和对象字面量创建值

字面量直接表达数据结构。通常使用 `[]` 和 `{}`；只有确实需要构造带空洞的定长数组等特殊场景，才使用数组构造器并说明原因。

```ts
// good
const users: User[] = [];
const options: Options = {};
```

```ts
// bad
const users = new Array<User>();
const options = new Object() as Options;
```

### [推荐] 对象方法和属性使用简写语法

ESLint: `object-shorthand` · [官方文档](https://eslint.org/docs/latest/rules/object-shorthand)

属性名与变量名相同、方法使用普通函数表达时，简写能减少重复。需要动态 `this` 的对象方法不要改成箭头函数。

```json
{ "object-shorthand": "warn" }
```

```ts
// good
const service = {
  request(id: string) {
    return Promise.resolve({ id });
  },
  load(id: string) {
    return this.request(id);
  },
};
```

```ts
// bad
const service = {
  load: function (id: string) {
    return this.request(id);
  },
};
```

### [规范] 在完整对象字面量中定义计算属性

优先在一次字面量声明中表达完整数据形状，避免创建后立即追加属性。动态键来自不受信任的输入时，还需考虑原型污染风险，必要时使用 `Map`。

```ts
// good
const counts = {
  [getKey()]: 1,
};
```

```ts
// bad
const counts: Record<string, number> = {};
counts[getKey()] = 1;
```

### [规范] 动态键值和唯一值集合优先使用 Map 和 Set

固定数据结构使用对象或数组；键不限于字符串、需要频繁增删或依赖迭代语义时使用 `Map`；表达唯一成员集合时使用 `Set`。不要仅因为 API 更新就把所有对象和数组替换为 Map/Set。

```ts
// good
const counts = new Map<object, number>();
const memberIds = new Set<string>();
```

```ts
// bad
const counts: Record<string, number> = {};
counts[String(objectKey)] = 1;
```

### [强制] 禁止修改原生对象和宿主对象的原型

ESLint: `no-extend-native` · [官方文档](https://eslint.org/docs/latest/rules/no-extend-native)

扩展原生原型会污染同进程内其他模块，产生命名冲突和不可预测的耦合。使用独立工具函数或局部组合类型替代。

```json
{ "no-extend-native": "error" }
```

```ts
// good
function unique<T>(items: T[]) {
  return [...new Set(items)];
}
```

```ts
// bad
Array.prototype.unique = function () {
  return [...new Set(this)];
};
```

### [规范] 避免修改外部传入的对象

函数不应暗中修改调用方仍持有的数据。需要不可变更新时返回新对象；确需原地修改的高性能或框架 API，应在名称、类型和文档中明确该契约。

```ts
// good
function selectNode(node: TreeNode): TreeNode {
  return { ...node, selected: true };
}
```

```ts
// bad
function selectNode(node: TreeNode) {
  node.selected = true;
  return node;
}
```
