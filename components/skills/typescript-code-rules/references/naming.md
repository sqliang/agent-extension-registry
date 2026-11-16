# 命名规范

本文件覆盖命名相关规则：`naming-convention` ESLint 规则，以及接口/类型别名 PascalCase、接口禁 I 前缀、`.ts`/`.tsx` 文件扩展名约定。

### [强制] 命名必须匹配命名规范

ESLint: `@typescript-eslint/naming-convention` · [官方文档](https://typescript-eslint.io/rules/naming-convention/)

统一命名格式可以让不同类型的标识符一目了然。约定：variableLike（变量/函数/参数）使用 camelCase 或 UPPER_CASE；typeLike（类/接口/类型别名/枚举/泛型参数）使用 PascalCase；枚举成员使用 PascalCase 或 UPPER_CASE；均不允许以下划线开头或结尾。外部协议中必须带引号的属性保留原样，双前导下划线的元数据属性（如 `__typename`）例外；普通业务属性和单前导下划线仍按常规检查。

```json
{
  "@typescript-eslint/naming-convention": [
    "error",
    { "selector": "property", "filter": "^__", "format": null },
    { "selector": "property", "modifiers": ["requiresQuotes"], "format": null },
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
const modalVisible = false;
const PERSON_NAMES: string[] = ['张三', '李四'];

function doSomething<T>(variable: T) {
  return variable;
}

interface OptionItem {
  label: string;
  value: string;
}

enum FourDirection {
  Up = 0,
  Down = 1,
  Left = 2,
  Right = 3,
}

interface GraphQLResult {
  __typename: string;
}

const headers = {
  'Content-Type': 'application/json',
};
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

interface InternalState {
  _cached: boolean;
}

enum fourDirection {
  up,
  down,
  left,
  right,
}
```

### [规范] 接口使用 PascalCase 命名，且不使用 I 前缀

接口名本身就是类型的抽象，加 `I` 前缀属于匈牙利命名法的遗留习惯，会增加噪音且与类型别名、类的命名风格不一致。

```ts
// good
interface ButtonProps {
  label: string;
}
```

```ts
// bad
interface IButtonProps {
  label: string;
}
```

### [规范] 类型别名使用 PascalCase 命名

类型别名与接口同属 typeLike，命名风格保持一致，使用大驼峰。

```ts
// good
interface HeaderStateProps {
  label: string;
}

interface HeaderDispatchProps {
  label: string;
}

type HeaderProps = HeaderStateProps & HeaderDispatchProps;
```

```ts
// bad
type headerProps = HeaderStateProps & HeaderDispatchProps;
```

### [规范] TypeScript 文件使用 .ts 扩展名，含 JSX 的使用 .tsx

扩展名是编译工具链和 IDE 识别文件类型的依据：普通 TypeScript 文件一律使用 `.ts`；只有包含 JSX 语法的文件才使用 `.tsx`。
