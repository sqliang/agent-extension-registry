---
title: React 设计哲学

aliases:
  - React Design Philosophy
  - React组件设计哲学

tldr: 以 70/30 原则为基，拆解 React 组件设计的完整方法论：从自治组件划分到反向数据流。

description: 深入阐述 React 组件设计的核心哲学，涵盖 70/30 设计原则、容器/展示组件分离、组合优于继承、state 安置策略及 AI 辅助 UI 划分流程。

abstract: 本文围绕 React 组件设计的核心哲学展开，系统阐述组件自治、组合优于继承、单一职责等工程原则，并给出 AI 辅助 UI 划分、自顶向下构建静态版本、识别最小完整 state 表示、确定 state 放置位置及反向数据流设计的完整方法论，最后通过注册表单、待办列表等四个场景进行实践验证，帮助读者构建可维护、可扩展的 React 应用架构。

tags:
  - tutorial
  - react
  - component-design
  - software-principles

domain: Technology

highlights:
  - 反直觉结论：在软件工程中，约 70% 的时间应投入于架构设计、需求拆解与接口语义推敲，仅 30% 用于编码，AI 时代这一比例并未被颠覆。
  - 核心洞见：组件划分的终极目标是「自治」——对外仅暴露 props 契约，对内通过局部状态管理自身行为，遵循单一职责与高内聚低耦合。
  - 工程警示：状态提升时必须遵循「最小且完整」原则，禁止因「未来可能用到」而前置冗余状态，从源头避免状态爆炸。

aiRelevance: medium

intent: {'type': 'instruct', 'description': '提供 React 组件设计哲学与工程实践的系统化教学指导'}

keyPoints:
  - {'content': 'React 设计哲学核心：70/30 原则与组件自治', 'children': [{'content': '70% 时间投入架构设计与接口语义推敲，AI 提升 30% 编码效率而非取代设计'}, {'content': '组件化架构：用户界面拆分为独立、可复用组件，数据流从 props 到 UI 形成闭环'}, {'content': '四大检查项：单一职责、组合优先、Fragment 替代 div、Hooks 替代 HOC'}]}
  - {'content': 'UI 自治组件划分方法论', 'children': [{'content': '容器组件：处理布局、逻辑、数据请求、状态管理，通过 props 传递数据给子组件'}, {'content': '展示组件：接收 props 渲染 UI，保持 DOM 扁平，避免嵌套过深'}, {'content': '组合优于继承：利用 children、render props、Hooks，将子组件作为 props 传递'}]}
  - {'content': '构建静态版本与 AI 辅助流程', 'children': [{'content': '自顶向下构建：用数据占位符跑通纯渲染路径，保证无副作用、幂等渲染'}, {'content': '强制验证组件接口（props）是否足够表达所有视觉差异'}, {'content': 'AI 辅助三步骤：输入描述→AI 建议层级结构→人工评估与完善'}]}
  - {'content': 'State 最小表示与放置位置', 'children': [{'content': 'State 最小且完整原则：剔除 derived data，保留影响渲染的最小数据集'}, {'content': '状态向上提升（Lifting State Up）：多组件同步读取时提升至最近公共父节点'}, {'content': '状态局部下沉（Colocating State）：通过 Context/Zustand/Jotai 隔离在最小子树'}]}
  - {'content': '反向数据流与回调契约设计', 'children': [{'content': '父组件通过 props 传递 onXxx 回调，子组件调用时不关心父组件如何响应'}, {'content': '「事件-回调-状态变更-重渲染」是响应式架构的最小内核'}, {'content': '跨层级通信用 Context+dispatch 或轻量级消息总线，但仍需保持单向数据流纪律'}]}
  - {'content': '四大实践场景', 'children': [{'content': '场景1：用户注册表单——FormContainer、FormField、PasswordField 等自治组件划分'}, {'content': '场景2：可筛选可排序待办列表——SearchBar、TodoList、TodoItem 组件及状态管理'}, {'content': '场景3：响应式导航栏——DesktopMenu、MobileMenu、HamburgerButton 等'}, {'content': '场景4：交互式数据可视化卡片——CardContainer、ChartComponent、DetailPanel'}]}

source: note

quality: good
---


