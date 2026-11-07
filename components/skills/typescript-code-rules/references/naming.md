# 命名规范

本文件覆盖命名相关规则：`naming-convention` ESLint 规则，以及接口/类型别名 PascalCase、接口禁 I 前缀、`.ts`/`.tsx` 文件扩展名约定。

### [强制] 命名必须匹配命名规范

ESLint: `@typescript-eslint/naming-convention` · [官方文档](https://typescript-eslint.io/rules/naming-convention/)

统一命名格式可以让不同类型的标识符一目了然。约定：variableLike（变量/函数/参数）使用 camelCase 或 UPPER_CASE；typeLike（类/接口/类型别名/枚举/泛型参数）使用 PascalCase；枚举成员使用 PascalCase 或 UPPER_CASE；均不允许以下划线开头或结尾。

```json
{
  "@typescript-eslint/naming-convention": [
    "error",
    { "selector": "default", "format": ["camelCase"], "leadingUnderscore": "forbid", "trailingUnderscore": "forbid" },
    { "selector": "variableLike", "format": ["camelCase", "UPPER_CASE"], "leadingUnderscore": "forbid", "trailingUnderscore": "forbid" },
    { "selector": "memberLike", "format": ["camelCase"], "leadingUnderscore": "forbid", "trailingUnderscore": "forbid" },
    { "selector": "property", "format": ["camelCase"], "leadingUnderscore": "forbid", "trailingUnderscore": "forbid" },
    { "selector": "method", "format": ["camelCase"], "leadingUnderscore": "forbid", "trailingUnderscore": "forbid" },
    { "selector": "typeLike", "format": ["PascalCase"], "leadingUnderscore": "forbid", "trailingUnderscore": "forbid" },
    { "selector": "enumMember", "format": ["PascalCase", "UPPER_CASE"], "leadingUnderscore": "forbid", "trailingUnderscore": "forbid" }
  ]
}
```

```ts
// good
let modalVisible = false;
const PERSON_NAMES: string[] = ['张三', '李四'];

function doSomething<T>(variable: T) {
  return variable;
}

interface OptionItem {
  label: string;
  value: string;
}

enum FourDirection {
  Up,
  Down,
  Left,
  Right,
}
```

```ts
// bad
let modalvisible = false;
const PERSONNAMES: string[] = ['张三', '李四'];

function dosomething<t>(Variable: t) {
  return Variable;
}

interface optionItem {
  Label: string;
  Value: string;
}

enum fourDirection {
  up,
  down,
  left,
  right,
}
```

### [强制] 接口使用 PascalCase 命名，且不使用 I 前缀

接口名本身就是类型的抽象，加 `I` 前缀属于匈牙利命名法的遗留习惯，会增加噪音且与类型别名、类的命名风格不一致。

```ts
// good
interface ButtonProps {
  // ...
}
```

```ts
// bad
interface IButtonProps {
  // ...
}
```

### [强制] 类型别名使用 PascalCase 命名

类型别名与接口同属 typeLike，命名风格保持一致，使用大驼峰。

```ts
// good
interface HeaderStateProps {
  // ...
}

interface HeaderDispatchProps {
  // ...
}

type HeaderProps = HeaderStateProps & HeaderDispatchProps;
```

```ts
// bad
type headerProps = HeaderStateProps & HeaderDispatchProps;
```

### [强制] TypeScript 文件使用 .ts 扩展名，含 JSX 的使用 .tsx

扩展名是编译工具链和 IDE 识别文件类型的依据：普通 TypeScript 文件一律使用 `.ts`；只有包含 JSX 语法的文件才使用 `.tsx`。
