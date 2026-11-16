# 浏览器环境规范

本文件只适用于浏览器或其他提供 DOM 的 TypeScript 项目。Node.js、纯类型包和非 DOM 项目跳过本分类；本分类均为场景化规范，不作为非浏览器代码的强制检查项。

### [规范] 使用现代 DOM 查询 API

根据语义使用 `querySelector`、`querySelectorAll` 或精确的 ID 查询，不使用 `document.all`、旧式集合遍历技巧和面向旧 IE 的兼容分支。缓存重复使用的查询结果，但不要为了微优化牺牲简单性。

```ts
// good
const submitButton = document.querySelector<HTMLButtonElement>('#submit');
```

```ts
// bad
const submitButton = document.all.item('submit');
```

### [规范] 通过 CSS 类和 classList 管理元素状态

优先用 CSS 类表达外观和状态，通过 `classList` 切换类名。必须设置动态几何值等内联样式时，保留正确的 CSS 单位。

```ts
// good
panel.classList.toggle('is-open', isOpen);
```

```ts
// bad
panel.style.display = isOpen ? 'block' : 'none';
panel.setAttribute('style', 'color: red; font-weight: bold;');
```

### [规范] 成对管理 DOM 事件监听器

使用 `addEventListener` 注册事件，并在组件销毁、元素移除或订阅结束时用同一函数引用和匹配的捕获选项调用 `removeEventListener`。优先通过框架生命周期或 `AbortController` 统一清理。

```ts
// good
const controller = new AbortController();
button.addEventListener('click', handleClick, { signal: controller.signal });

function dispose() {
  controller.abort();
}
```

```ts
// bad
button.onclick = handleClick;
button.addEventListener('click', event => handleClick(event));
// 匿名函数无法在销毁时按同一引用移除。
```

### [规范] 批量更新 DOM 并避免布局抖动

集中进行读操作和写操作，避免在循环中交替读取布局并修改样式。优先批量构建节点后一次挂载；只有测量到性能瓶颈时才引入更复杂的渲染策略。

```ts
// good
const fragment = document.createDocumentFragment();
for (const item of items) {
  const element = document.createElement('li');
  element.textContent = item.label;
  fragment.append(element);
}
list.replaceChildren(fragment);
```

```ts
// bad
for (const item of items) {
  list.innerHTML += `<li>${item.label}</li>`;
  console.log(list.offsetHeight);
}
```

### [规范] 使用安全 API 渲染动态内容

文本使用 `textContent`，属性使用明确类型的 DOM API；不要把未经可信消毒的输入拼入 `innerHTML`、事件属性或 URL。复杂视图优先使用具备默认转义能力的框架或模板系统。

```ts
// good
const message = document.createElement('p');
message.textContent = userInput;
container.replaceChildren(message);
```

```ts
// bad
container.innerHTML = `<p>${userInput}</p>`;
button.setAttribute('onclick', `submit('${userInput}')`);
```
