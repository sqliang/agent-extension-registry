# CSS 编码规范 【已发布】

> 来源：lingjing 项目 · Code 规范 + Review 规范
> 原文链接：https://ku.baidu-int.com/knowledge/HFVrC7hq1Q/xjYiDpu--c/659DHIQpcQ/0815e7db491c47

## 目录

- 1 CSS 开发
  - 1.1 优先使用 Tailwind
  - 1.2 对于视觉设计中在全局范围有效的 antd 组件样式，请使用 antd 定制主题
    - 1.2.1 全局属性，请在 token 字段中进行配置
    - 1.2.2 组件特有样式，请在 components 字段中配置该组件的属性
      - 1.2.2.1 【示例】配置 Input 组件不同状态的 border 颜色和圆角；配置 Message 组件的 boxShadow
      - 1.2.2.2 【强制】配置 antd 全局组件（message、notification、Modal）的属性后，不可直接通过 API 调用
    - 1.2.3 主题配置中未提供属性修改该全局样式时
  - 1.3 需要局部范围修改的 antd 组件内部样式时，请使用 css-in-js 的方式
    - 1.3.1 覆盖 antd 全局组件（message、notification、Modal）的默认样式
    - 1.3.2 非全局组件
    - 1.3.3 antd 组件的样式存在多处复用时，可以提取公共样式
- 2 tailwind
  - 2.1 【强制】对于间距，优先使用项目中已配置的变量
  - 2.2 【强制】对于视觉中的间距，若 tailwind 中无配置，在 extend 字段扩展 spacing 配置
  - 2.3 视觉中需适配不同设备的场景下，请使用响应式修饰符
  - 2.4 根据视觉需求，在 theme.screens 中配置断点
- 3 css-in-js
  - 3.1 使用 theme 主题配置的变量，保证设计修改的统一
- 4 页面状态处理
  - 4.1 使用 antd 提供的自定义空组件来渲染页面的空状态
  - 4.2 错误状态处理
    - 4.2.2 需要对 \<Boundary\> 进行错误状态处理
  - 4.3 加载状态组件

---

## 概述

lingjing 项目中目前支持四类 CSS 的开发形式：tailwind、antd 定制主题、css-in-js、app.global.less 全局样式。

1. **tailwind**：项目中首要的 css 开发方式（注意不能配置 import）。
2. **antd 定制主题**：项目使用的 antd UI 组件，antd 提供了定制主题。可在 `lingjing-light-theme.js` 文件中配置 antd 组件的样式属性，统一修改组件的样式。
3. **css-in-js**：常用于修改/覆盖 antd 组件内部样式的场景。
   - **@emotion/styled**：css-in-js 会将文件内的 style 整合插入到 head 的 script 中。为了保证样式局部有效，避免产生污染，会生成一个随机的样式名称作为前缀样式。
   - **@emotion/css**：调用 css 构造自定义样式，通过 className 传入。
4. **全局样式**：`app.global.less`。less 格式，该文件内的样式全局有效。

---

# 1 CSS 开发

## 1.1 优先使用 Tailwind

**解释**：使用 tailwind 可以满足视觉需求时，请使用 tailwind 来开发 css 样式。项目中涉及到 antd 组件内部样式覆盖的情况下，才考虑其他方式。

## 1.2 对于视觉设计中在全局范围有效的 antd 组件样式，请使用 antd 定制主题

**解释**：项目中使用的 antd 组件，antd 会提供定制主题。对于视觉规范中会涉及关于组件的字体、状态、颜色等统一规范，使用定制主题配置，有利于保证和维护项目视觉风格的统一。

定制主题有 `token` 和 `components` 两个属性：

- `token` 中配置的为全局 token 属性，在此处配置后对有该属性的组件都生效。
- `components` 中配置具体组件的属性，组件的定制主题有全局 token 和组件 token 两类。

### 1.2.1 全局属性，请在 token 字段中进行配置

例：在 `token` 属性中可以配置 antd 的全局 token，如主题颜色、border 颜色、圆角的大小等。

```javascript
export default {
    token: {
        colorPrimary: '#1a46ff',
        colorError: '#ff4d4f',
        colorSuccess: '#00b47e',
        colorInfo: '#1890ff',
        colorWarning: '#faad14',
        colorBorder: '#e4e6eb',
        colorBorderSecondary: '#eceef3',
        borderRadiusLG: 9, // 模态框的圆角
        borderRadiusSM: 6,
    },
    components: {
        ...
    }
}
```

### 1.2.2 组件特有样式，请在 components 字段中配置该组件的属性

**解释**：每个组件支持的主题变量分全局 Token 和组件 Token 两类（eg. 查询 Message 的主题变量），全局 Token 可以继承 `token` 中的配置，组件 Token 为组件私有。

#### 1.2.2.1 【示例】配置 Input 组件不同状态的 border 颜色和圆角；配置 Message 组件的 boxShadow

```javascript
export default {
    token: {
        ...
    },
    components: {
        Input: {
            // 与公共样式不一致
            borderRadius: 9,
            colorBorder: '#eceef3',
            controlOutline: 'transparent', // 输入组件不要外轮廓线
            colorErrorOutline: 'transparent',
            colorError: '#eceef3', // 输入组件 error 状态下的 border 颜色
            colorErrorBorderHover: '#1a46ff',
            colorPrimaryActive: '#1a46ff',
            colorPrimaryHover: '#1a46ff',
        },
        Message: {
            boxShadow: '0 2px 2px 2px #e1e1e1',
        },
    }
}
```

#### 1.2.2.2 【强制】配置 antd 全局组件（message、notification、Modal）的属性后，不可直接通过 API 调用

**解释**：直接调用 `message`、`notification`、`Modal` 方法（eg. `message.error()`、`notification.info()`、`Modal.`），antd 会通过 `ReactDOM.render` 动态创建新的 React 实体。其 context 与当前代码所在 context 并不相同，因而无法获取 context 信息，因此配置会不生效。

当你需要 context 信息（例如 ConfigProvider 配置的内容）时，可以通过 `message.useMessage`、`notification.useNotification()`、`Modal.useModal()` 方法返回 api 实体以及 `contextHolder` 节点。将其插入到你需要获取 context 位置即可。

```javascript
// bad
import {message} from 'antd';

export default function Page() {
    const handle = useCallback(() => {
        message.error(...);
    }, []);
    return (<div>...</div>)
}


// good 使用 useMessage 获取 api 实体
import {message} from 'antd';
export default function Page() {
    // 通过 message.useMessage() 获取 message 实体 和 contextHolder
    const [messageApi, contextHolder] = message.useMessage();
    const handle = useCallback(() => {
        ...
        // 这样调用，theme 配置的全局样式可生效。
        messageApi.open({
            type: 'error',
            content: 'xxxx'
        });
    }, []);
    return (
    <div>
        ...
        // 手动植入 contextHolder
        {contextHolder}
    </div>
    )
}
```

### 1.2.3 主题配置中未提供属性修改该全局样式时

请在 `app.global.less` 中补充全局样式。

## 1.3 需要局部范围修改的 antd 组件内部样式时，请使用 css-in-js 的方式

**解释**：antd 全局组件的自定义样式略有不同，需要通过 `className` 参数传入 css class。

### 1.3.1 覆盖 antd 全局组件（message、notification、Modal）的默认样式

例：调用 message 组件时传入自定义样式

```javascript
import {css} from '@emotion/css';
import {message} from 'antd';

// 通过 css 创建样式
export const customMessage = css`
    .ant-message {
        border: "1px solid #e1e1e1"
    }
`;

export default function CustomMessage() {
    // 通过 message.useMessage() 获取 message 实体 和 contextHolder
    const [messageApi, contextHolder] = message.useMessage();
    const handle = useCallback(() => {
        ...
        // 调用时传入自定义样式
        messageApi.error({
            content: 'xxxx',
            className: {customMessage}
        });
    }, []);
    return (
        <div>...
            {contextHolder}
        </div>
    )
}
```

### 1.3.2 非全局组件

**解释**：可以根据情况选择合适的方式。

⚠️ Dropdown 组件中使用了 Menu 组件，并且 Menu 组件与 Dropdown 组件的层级非父子关系，这种情况下，需使用 `@emotion/css`，因为 `@emotion/styled` 会生成一个父样式，局部有效。

**1）`@emotion/css` 中的 css 构造自定义样式，通过 className 传入。**

```javascript
import {css} from '@emotion/css';
import {From} from 'antd';

// 使用 @emotion/css
export const customTableStyle = css`
    .ant-table {
        background: "#e1e1e1"
    }
`;


export default function CustomMessage() {
    return (
    <div>...
        <Table className={customTableStyle}/>
    </div>
    )
}
```

**2）`@emotion/style` 中的 styled 构造自定义样式。**

```javascript
import {css} from '@emotion/css';
import styled from '@emotion/style';
import {Modal, message} from 'antd';

// 使用 @emotion/style
export const CustomFormWrapper = styled(Form)`
    // 覆盖 antd 内部样式
    .ant-form-item-label .ant-form-item-required::before {
        content: '' !important;
    }
    // 覆盖 antd 内部样式
    .ant-form-item-label .ant-form-item-required::after {
        content: '*' !important;
        display: inline-block;
        color: #ff4d4f;
        font-size: 18px;
        line-height: 1;
        text-align: center;
        vertical-align: middle;
        top: 3px;
    }
`;

export default function CustomMessage() {
    return (
        <div>...
            <CustomFormWrapper />
        </div>
    )
}
```

### 1.3.3 antd 组件的样式存在多处复用时，可以提取公共样式

**解释**：例如视觉中表格、表单等组件的样式多处一致时，可以提取公共样式，便于复用。

---

# 2 tailwind

> [tailwind 默认配置](https://tailwindcss.com/docs/theme)

## 2.1 【强制】对于间距，优先使用项目中已配置的变量

**解释**：优先使用 tailwind 中 spacing 已配置的变量。默认配置 + `theme.extend.spacing` 的配置。

（以下 style 皆会继承 spacing 属性中配置的值：`padding`、`margin`、`width`、`height`、`maxHeight`、`gap`、`inset`、`space`、`translate`、`scrollMargin`、`scrollPadding`）

```jsx
// good

<div class="px-13"></div>

// bad

<div class="px-[52px]"></div>

// bad

<div class="px-[3.25rem]"></div>
```

## 2.2 【强制】对于视觉中的间距，若 tailwind 中无配置，在 extend 字段扩展 spacing 配置

**解释**：目前项目已使用 tailwind 的默认配置，新增配置时需在 `extend` 下进行扩展（在 `tailwind.spacing` 中配置会覆盖默认配置）。配置时遵循 tailwind 默认换算规则：

`number（tailwind 配置）：size（实际 rem）：pixel（视觉稿 px） = （4 : 1 rem : 16 px）`

```javascript
// tailwind.config.js

// good
module.exports = {
    theme: {
        extend: {
            spacing: {
                '13.25': '3.3125rem',
                '128': '32rem',
            }
        }
    }
}
```

## 2.3 视觉中需适配不同设备的场景下，请使用响应式修饰符

**解释**：需与视觉同学沟通适配的设备尺寸。

```jsx
// 响应式修饰符使用示例

// 字体位置
<div class="md:text-leftxl:text-center">不同屏幕尺寸下的字体位置</div>

// hover 状态
<div class="lg:hover:bg-primary">不同屏幕尺寸下的 hover 状态</div>

// 不同布局下的节点显隐
<div class="sm:block lg:hidden">不同屏幕尺寸下节点的显隐</div>
```

## 2.4 根据视觉需求，在 theme.screens 中配置断点

**解释**：如果需要补充断点，则需在配置文件中的 `screen` 字段补充。

⚠️ 注意：`screen` 字段的配置需要按照从小到大的顺序，否则会不生效。

```javascript
// good
module.exports = {
  theme: {
      screens: {
          'sm': '640px',  // => @media (min-width: 640px) { ... }
          'md': '768px',  // => @media (min-width: 768px) { ... }
          'lg': '1024px', // => @media (min-width: 1024px) { ... }
          'xl': '1280px', // => @media (min-width: 1280px) { ... }
          '2xl': '1536px', // => @media (min-width: 1536px) { ... }
      }
  }
}


// bad 未按照从小到大的顺序，'phone' 无法生效。
module.exports = {
    theme: {
        screens: {
            'sm': '640px',  // => @media (min-width: 640px) { ... }
            'md': '768px',  // => @media (min-width: 768px) { ... }
            'lg': '1024px', // => @media (min-width: 1024px) { ... }
            'xl': '1280px', // => @media (min-width: 1280px) { ... }
            '2xl': '1536px', // => @media (min-width: 1536px) { ... }
            'phone': '380px'
        }
    }
}


// bad 在 extend 扩展，合并后不是从小到大的顺序，新增的这两个会不生效
module.exports = {
    theme: {
        extend: {
            screens: {
                'phone': '380px', // => @media (min-width: 640px) { ... }
                'pad': '800px', // => @media (min-width: 768px) { ... }
            }
        }
    }
}
```

---

# 3 css-in-js

## 3.1 使用 theme 主题配置的变量，保证设计修改的统一

**解释**：通过 `ThemeProvider` 传入 theme 配置，在 css-in-js 中通过 props 获取 theme。

⚠️ `useTheme()` 也可以获取 theme 变量，但不是在 css-in-js 中直接使用的场景下，使用 tailwind 的变量即可满足需求，不推荐。

```jsx
import {ThemeProvider} from '@emotion/react'
import styled from '@emotion/styled'
import theme from '../../../styles/lingjing-light-theme';

// Form 表单的自定义样式
const FormWrapper = styled(Form)`
    .ant-form-item-label .ant-form-item-required::after {
        content: '*' !important;
        // 使用 theme 变量
        color: ${props => props.theme.colorWarning};
    }
`

export default Render() {
    return(
        <ThemeProvider theme={theme}>
            <FormWrapper> ... </FormWrapper>
        </ThemeProvider>
    )
}
```

---

# 4 页面状态处理

## 4.1 使用 antd 提供的自定义空组件来渲染页面的空状态

**解释**：通过 ConfigProvider 的 `renderEmpty` 来渲染自定义空组件。

```jsx
// good
import {ConfigProvider} from 'antd';
import {Card} from './components/card';
import {CustomEmpty} from './components/empty';

export default CustomComponent({list}) {
    return (
        <ConfigProvider renderEmpty={() => <CustomEmpty />}>
            {list.map((item) => <Card data={item}/>)}
        </ConfigProvider>
    )
}


// bad
import {Card} from './components/card';
import {CustomEmpty} from './components/empty';

export default CustomComponent({list}) {
    return (
        <div>
        {
            list.length > 0 && list.map((item) => <Card data={item}/>)
        }
        {
            list.length === 0 && <CustomEmpty />
        }
        <div>
    )
}


// antd example
import {
    Cascader,
    ConfigProvider,
    List,
    Select,
    Space,
    Switch,
    Table,
    Transfer,
    TreeSelect,
} from 'antd';
import {CustomEmpty} from './components/empty';

export default CustomComponent() {
    return (
        // 内部的组件空状态
        <ConfigProvider renderEmpty={() => <CustomEmpty />}>
            <Select />
            <List />
            <Cascader />
            <TreeSelect />
            ...
            <Table />
        </ConfigProvider>
    )
}
```

## 4.2 错误状态处理

（公共组件）错误状态组件：`src/components/Loading/LoadError.tsx`

```jsx
import {Boundary, CacheProvider} from 'react-suspense-boundary';
import LoadError from '@/components/Loading/LoadError';

export default function Detail() {
    return (
        <Boundary
            pendingFallback={<Loading />}
            renderError={(error: any) => <RenderError errorCode={error.errno} msg={error.msg} />}
        >
            <div> ... </div>
        </Boundary>
    );
}
```

### 4.2.2 需要对 \<Boundary\> 进行错误状态处理

```jsx
import {Boundary, CacheProvider} from 'react-suspense-boundary';

export default function Detail() {
    return (
        <CacheProvider>
            <Boundary
                pendingFallback={<Loading />}
                renderError={(error: any) => <RenderError errorCode={error.errno} msg={error.msg} />}
            >
                <div> ... </div>
            </Boundary>
        </CacheProvider>
    );
}
```

## 4.3 加载状态组件

### 4.3.1 全局加载公共组件

组件：`src/components/Loading/LingJingLoading.tsx`

基于视窗居中，3 s 的透明度（0.5 -> 1）的动画。

### 4.3.2 局部加载公共组件

组件：`src/components/Loading/index.tsx`

基于父组件居中，3 s 的透明度（0.5 -> 1）的动画，支持配置 size。

> 📎 原文档此处附带演示视频附件：`屏幕录制2023-11-06 下午5.48.20.mov`（5.1MB），Markdown 无法内嵌视频，详见原文链接。
