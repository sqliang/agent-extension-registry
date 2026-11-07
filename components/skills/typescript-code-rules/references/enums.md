# 枚举规范

本文件覆盖枚举相关规则：禁重复成员值、成员显式初始化、字面量成员值，以及 `const enum` 的规范。

### [强制] 禁止重复的 enum 成员值

ESLint: `@typescript-eslint/no-duplicate-enum-values` · [官方文档](https://typescript-eslint.io/rules/no-duplicate-enum-values/)

枚举成员通常期望具有唯一的值，重复的值会导致难以追踪的错误（例如 switch 分支永远无法命中）。

```json
{ "@typescript-eslint/no-duplicate-enum-values": "error" }
```

```ts
// good
enum E {
  A = 0,
  B = 1,
}

enum F {
  A = 'A',
  B = 'B',
}
```

```ts
// bad
enum E {
  A = 0,
  B = 0, // 与 A 重复
}

enum F {
  A = 'A',
  B = 'A', // 与 A 重复
}
```

### [推荐] 每个枚举成员必须被显式初始化

ESLint: `@typescript-eslint/prefer-enum-initializers` · [官方文档](https://typescript-eslint.io/rules/prefer-enum-initializers/)

未指定值的枚举成员会被赋予自增数字。当枚举值本身很重要（如对接后端、持久化）时，隐式自增值在枚举被增删成员后会悄悄变化，造成缺陷。建议每个成员都显式写出值。

```json
{ "@typescript-eslint/prefer-enum-initializers": "warn" }
```

```ts
// good
enum Status {
  Open = 'Open',
  Close = 'Close',
}

enum Direction {
  Up = 1,
  Down = 2,
}
```

```ts
// bad
enum Status {
  Open = 1,
  Close, // 隐式自增为 2，成员变化时会悄悄改变
}

enum Direction {
  Up,
  Down,
}
```

### [强制] 枚举成员的值使用常量字面量

ESLint: `@typescript-eslint/prefer-literal-enum-member` · [官方文档](https://typescript-eslint.io/rules/prefer-literal-enum-member/)

TypeScript 允许枚举值是任意有效的 JS 表达式，但枚举内部是独立作用域，引用变量会产生违反直觉的结果。因此枚举值只允许常量字面量（允许常量位运算）。

```json
{ "@typescript-eslint/prefer-literal-enum-member": ["error", { "allowBitwiseExpressions": true }] }
```

```ts
// good
enum Valid {
  A,
  B = 'TestStr', // 字符串字面量
  C = 4, // 数字字面量
  F = 1 << 2, // 常量位运算（allowBitwiseExpressions）
}
```

```ts
// bad
const str = 'Test';
const num = 0;

enum Invalid {
  A = str, // 变量
  B = {}, // 对象
  C = `A template literal string`, // 模板字面量
  D = new Set([1, 2, 3]), // 构造函数调用
  E = 2 + 2, // 表达式
  F = num << 1, // 非常量位运算
}
```

### [强制] 使用 const 声明枚举

`const enum` 在编译后会被完全内联擦除，不生成额外的运行时代码，体积和性能都更好。如果枚举值需要被外部动态遍历，再考虑普通 `enum`。

```ts
// good
const enum Directions {
  UP,
  DOWN,
  LEFT,
  RIGHT,
}
```

```ts
// bad
enum Directions {
  UP,
  DOWN,
  LEFT,
  RIGHT,
}
```
