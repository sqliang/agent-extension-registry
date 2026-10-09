# 架构与边界

## 单一能力源

`components/` 是唯一可编辑能力源。Plugin 和 Profile 只引用版本范围，Adapter 只做确定性投影，`dist/` 永远从源生成。

```text
Component sources
      │ component.yaml + source files
      ▼
Dependency resolver ─────► exact versions ─────► agent-ext.lock.json
      │
      ├── Codex adapter  ─► .agents/skills
      ├── Claude adapter ─► .claude/skills
      └── Cursor adapter ─► .cursor/skills
```

每个项目只有一份可写业务源；三端目录都是安装投影，不应反向同步回 Registry。

## 可移植边界

- Skills 与 MCP 采用 Agent Plugins 的可移植模型。
- Commands 不再作为公共类型；旧命令迁移为 `invocation: explicit` 的 Skill。
- Agent、Hook、Rule 等能力必须声明支持宿主。必需能力不支持目标宿主时安装失败；可选能力会跳过并报告。
- Codex 的显式 Skill 生成 `agents/openai.yaml`；Claude/Cursor 投影为对应 Skill frontmatter。

## 安装事务

```text
解析请求 → 解析依赖图 → Adapter 投影 → 冲突/哈希检查
                                      │
                         dry-run ◄────┤
                                      ▼
                         临时目录完整写入并复验
                                      ▼
                        备份冲突 → 原子 rename → 写锁文件
```

单个文件使用同文件系统 rename；锁文件最后写入。若进程在中途失败，临时目录会清理，既有锁文件不会提前宣称成功。

## 数据边界

允许提交：可复用提示与脚本、脱敏示例、合成 fixture、Schema、测试。

禁止提交：真实知识库、未脱敏博客草稿、私人日程、账户凭据、客户仓库快照、真实 PDF/OCR 结果。
