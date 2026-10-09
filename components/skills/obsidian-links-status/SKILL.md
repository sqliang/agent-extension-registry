---
name: obsidian-links-status
description: 显式调用后，查看指定 Obsidian 笔记的外链、反链与章节结构，不修改笔记。
---

# Obsidian Links Status

从当前 Skill 目录定位同级的 `obsidian-smart-links` 组件，并运行：

```bash
python3 ../obsidian-smart-links/scripts/analyze_links.py "<笔记名或路径>" --status
```

若无法定位同级组件，停止并报告依赖缺失。该操作只读，不得写回笔记。
