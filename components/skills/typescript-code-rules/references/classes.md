# 类规范

本文件覆盖类相关规则：成员可访问性标注、成员顺序、readonly 私有成员、返回 this 类型、禁类当命名空间、new/constructor 有效定义，以及每文件一类、省略空构造函数、成员空行、参数属性等规范。

### [强制] 明确类成员可访问性，public 不显式声明

ESLint: `@typescript-eslint/explicit-member-accessibility` · [官方文档](https://typescript-eslint.io/rules/explicit-member-accessibility/)

`public`/`protected`/`private` 修饰符能明确哪些成员是私有实现、哪些是对外接口。约定使用 `no-public` 模式：`protected`/`private` 必须显式标注，而 `public` 是默认值，不需要再写。规范版「类成员的可访问性为 public 时不应显式声明」与本规则配置一致。

```json
{ "@typescript-eslint/explicit-member-accessibility": ["error", { "accessibility": "no-public" }] }
```

```ts
// good
class Animal {
  constructor(protected breed: string, name: string) {
    // 参数属性和构造函数
    this.animalName = name;
  }

  private animalName: string; // 属性

  get name(): string {
    // get 访问器
    return this.animalName;
  }

  private set name(value: string) {
    // set 访问器
    this.animalName = value;
  }

  protected walk() {
    // 方法
  }
}
```

```ts
// bad
class Animal {
  public constructor(public breed: string, name: string) {
    this.animalName = name;
  }

  public animalName: string; // public 是默认值，不需要显式声明

  public get name(): string {
    return this.animalName;
  }

  public walk() {
    // ...
  }
}
```

### [推荐] 使用一致的对象成员顺序

ESLint: `@typescript-eslint/member-ordering` · [官方文档](https://typescript-eslint.io/rules/member-ordering/)

把属性、方法、构造器以一致的顺序排列（签名 → 字段 → 构造函数 → 方法），可以让代码更容易阅读、检索和编辑。

```json
{ "@typescript-eslint/member-ordering": "warn" }
```

```ts
// good
class Foo {
  [Z: string]: any; // -> signature

  private C: string; // -> field
  public D: string; // -> field
  protected static E: string; // -> field

  constructor() {} // -> constructor

  public static A(): void {} // -> method
  public B(): void {} // -> method
}
```

```ts
// bad
class Foo {
  public static A(): void {} // method 排在最前

  constructor() {} // constructor 插在中间

  [Z: string]: any; // signature 排在后面

  private C: string; // field 排在最后
}
```

### [推荐] 私有成员只在构造函数中修改时标记 readonly

ESLint: `@typescript-eslint/prefer-readonly` · [官方文档](https://typescript-eslint.io/rules/prefer-readonly/)

标记为 `private` 的成员不应在类外访问；如果它只在构造函数中被赋值，就应当再加上 `readonly`，把「不可变」的意图表达在类型上。

```json
{ "@typescript-eslint/prefer-readonly": "warn" }
```

```ts
// good
class Container {
  // 公共成员可能被外部修改
  public publicMember: boolean;

  // 受保护成员可能被子类修改
  protected protectedMember: number;

  // 私有成员会被非构造函数修改
  private modifiedLater = 'unchanged';

  // 只初始化、从不修改，标记 readonly
  private readonly neverModifiedMember = true;

  public mutate() {
    this.modifiedLater = 'mutated';
  }
}
```

```ts
// bad
class Container {
  // 从未被修改，应该标记 readonly
  private neverModifiedMember = true;
  private onlyModifiedInConstructor: number;

  public constructor(
    onlyModifiedInConstructor: number,
    // 私有参数属性同样应该标记 readonly
    private neverModifiedParameter: string,
  ) {
    this.onlyModifiedInConstructor = onlyModifiedInConstructor;
  }
}
```

### [推荐] 返回当前类型时优先使用 this 类型

ESLint: `@typescript-eslint/prefer-return-this-type` · [官方文档](https://typescript-eslint.io/rules/prefer-return-this-type/)

实现方法链（fluent API）时，如果方法显式声明返回当前类的类型，子类调用后得到的会是父类类型，丢失子类方法。使用 `this` 类型可以避免这个问题。

```json
{ "@typescript-eslint/prefer-return-this-type": "warn" }
```

```ts
// good
class Foo {
  f1(): this {
    return this;
  }

  f2() {
    return this;
  }

  f3 = (): this => {
    return this;
  };
}
```

```ts
// bad
class Foo {
  f1(): Foo {
    return this; // 子类调用 f1() 后类型退化为 Foo
  }

  f2 = (): Foo => {
    return this;
  };
}

class Animal {
  eat(): Animal {
    return this;
  }
}

class Cat extends Animal {
  meow(): Cat {
    return this;
  }
}

const cat = new Cat();
cat.eat().meow(); // 报错：Animal 类型上不存在 meow 方法
```

### [推荐] 不允许将类用作命名空间

ESLint: `@typescript-eslint/no-extraneous-class` · [官方文档](https://typescript-eslint.io/rules/no-extraneous-class/)

只装静态成员的类（静态常量集合、纯工具函数包装类）属于多余的抽象：相关函数直接放在模块顶层导出即可，也可以用 `import * as ...` 聚合。类当命名空间会增加认知负担，也不利于 IDE 补全和静态分析。

```json
{ "@typescript-eslint/no-extraneous-class": "warn" }
```

```ts
// good
export const version = 42;

export function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function logHelloWorld() {
  console.log('Hello, world!');
}
```

```ts
// bad
class StaticConstants {
  static readonly version = 42;

  static isProduction() {
    return process.env.NODE_ENV === 'production';
  }
}

class HelloWorldLogger {
  constructor() {
    console.log('Hello, world!'); // 构造函数只做事、不产出实例状态
  }
}
```

### [强制] 强制 new 和 constructor 的有效定义

ESLint: `@typescript-eslint/no-misused-new` · [官方文档](https://typescript-eslint.io/rules/no-misused-new/)

刚接触类和接口的开发者容易混淆 `constructor` 和 `new`：类上定义名为 `new` 的方法、接口上定义名为 `constructor` 的方法，都是错误的写法。

```json
{ "@typescript-eslint/no-misused-new": "error" }
```

```ts
// good
declare class C {
  constructor();
}

interface I {
  new (): C;
}
```

```ts
// bad
declare class C {
  new (): C; // 类上不应定义 new 方法
}

interface I {
  constructor(): void; // 接口上不应定义 constructor 方法
}
```

### [建议] 每个文件中最多声明一个类

一个文件一个类可以让模块职责单一、便于检索和代码评审。多个强相关的轻量类型（接口、类型别名）不受此限。

```ts
// good
// Button.tsx 中只声明 Button 一个类
class Button extends PureComponent<ButtonProps, ButtonState> {
  // ...
}
```

```ts
// bad
// 一个文件中堆放多个互不相关的类
class Button extends PureComponent<ButtonProps, ButtonState> {
  // ...
}

class Modal extends PureComponent<ModalProps, ModalState> {
  // ...
}
```

### [建议] 构造函数可忽略时应忽略

只做 `super(props)` 透传、没有任何额外逻辑的构造函数是多余的，直接省略让代码更干净。

```ts
// good
class Button extends PureComponent<ButtonProps, ButtonState> {
  readonly state: ButtonState = {
    clicked: false,
  };

  render() {
    // ...
  }
}
```

```ts
// bad
class Button extends PureComponent<ButtonProps, ButtonState> {
  readonly state: ButtonState = {
    clicked: false,
  };

  constructor(props: ButtonProps) {
    super(props); // 纯透传，应整个省略
  }

  render() {
    // ...
  }
}
```

### [建议] 类成员之间使用空行隔开

成员之间用空行分隔，可以让类的结构（属性区、构造器、方法区）一目了然，尤其在成员较多时明显降低阅读成本。

```ts
// good
class Button extends PureComponent<ButtonProps, ButtonState> {
  readonly state: ButtonState = {
    clicked: false,
  };

  handleClick = () => {
    // ...
  };

  render() {
    // ...
  }
}
```

```ts
// bad
class Button extends PureComponent<ButtonProps, ButtonState> {
  readonly state: ButtonState = {
    clicked: false,
  };
  handleClick = () => {
    // ...
  };
  render() {
    // ...
  }
}
```

### [建议] 构造函数初始化实例属性时尽量使用参数属性

TypeScript 的参数属性（`constructor(private readonly x: X)`）可以在声明参数的同时完成属性声明和赋值，避免「声明属性 + 构造函数赋值」的重复样板。

```ts
// good
class AppComponent {
  constructor(private readonly heroService: HeroService) {}
}
```

```ts
// bad
class AppComponent {
  private readonly heroService: HeroService;

  constructor(heroService: HeroService) {
    this.heroService = heroService;
  }
}
```

### [建议] 构造函数中作为属性的参数排列于其他参数前

把会成为实例属性的参数集中放在参数列表前面，读签名时就能快速区分「这个类依赖什么」与「这次构造还需要什么临时参数」。

```ts
// good
class HeroListComponent {
  constructor(
    private readonly heroService: HeroService, // 属性参数在前
    private readonly logger: Logger,
    initialFilter: string, // 其他参数在后
  ) {
    // ...
  }
}
```

```ts
// bad
class HeroListComponent {
  constructor(
    initialFilter: string, // 普通参数混在属性参数前面
    private readonly heroService: HeroService,
    pageSize: number,
    private readonly logger: Logger,
  ) {
    // ...
  }
}
```
