# 风格与注释规范

本文件保留跨项目通用的文件和注释约定。缩进、引号、分号、行宽和运算符换行属于项目排版配置，不由本 Skill 指定唯一风格，也不覆盖项目已有 Formatter。

### [规范] 文件使用无 BOM 的 UTF-8 编码

UTF-8 具有广泛的工具兼容性；BOM 可能干扰部分解析器和构建工具。新建 TypeScript 文件统一使用无 BOM 的 UTF-8。

```text
good: UTF-8 without BOM
bad: UTF-8 with BOM, or a platform-specific legacy encoding
```

### [规范] 文件结尾保留一个换行

文本文件以单个换行符结束，便于拼接、diff 和 POSIX 工具处理。这里指最后一行以换行结束，不是额外添加多个空白行。

```ts
export const ready = true;
// 此行结束后保留一个换行符
```

### [规范] 排版风格由项目 Formatter 统一执行

项目应选择一种 Formatter 配置并自动执行，避免人工争论空格和换行。本 Skill 不强制 2/4 空格、单/双引号、分号、120 列或运算符位置；Review 时以项目配置为准，不用另一套排版偏好覆盖它。

```json
{
  "editor.formatOnSave": true
}
```

### [规范] 按逻辑边界组织空行和语句

空行用于分隔不同逻辑阶段，而不是机械地拉开每一行。相关语句保持紧凑，数据准备、校验、执行和结果处理等阶段可适度分组。

```ts
// good
function runWorkflow() {
  const input = readInput();
  const options = parseOptions(input);

  const result = execute(options);
  return result;
}
```

### [规范] 注释解释意图、约束和非显然原因

代码和名称已经清楚的“做什么”不必复述。注释重点记录业务约束、外部协议、非显然取舍和陷阱；TODO/FIXME 应说明下一步或问题，而不是只有标记。

```ts
// good
// 上游服务只保证 30 秒内幂等，超时后必须换新的请求 ID。
const requestId = createRequestId();
```

```ts
// bad
// 创建请求 ID。
const requestId = createRequestId();
```

### [规范] 公共 API 按需使用 TSDoc，类型由 TypeScript 表达

公共 API 可用 TSDoc 描述用途、参数语义、返回值、异常和示例；类型以 TypeScript 声明为准，不在 `@param {type}` 中重复维护。不要强制每个文件添加 `@file`、`@author`、`@const` 或历史模块标签。

```ts
// good
/**
 * 按租户读取配置。
 * @throws 当租户不存在或配置不是有效 JSON 时抛出错误。
 */
export declare function readConfig(tenantId: string): Promise<Config>;
```

```ts
// bad
/**
 * @file config.ts
 * @author someone
 * @param {string} tenantId 租户 ID
 */
```
