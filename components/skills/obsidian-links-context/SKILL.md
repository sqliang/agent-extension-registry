---
name: obsidian-links-context
description: 显式调用后，导出指定 Obsidian 笔记的链接分析上下文，供后续人工或 Agent 深度分析。
---

# Obsidian Links Context

从当前 Skill 目录定位同级的 `obsidian-smart-links` 组件，并运行：

```bash
python3 ../obsidian-smart-links/scripts/analyze_links.py "<笔记名或路径>" --export-context
```

若无法定位同级组件，停止并报告依赖缺失。不要猜测 vault 或笔记路径。
