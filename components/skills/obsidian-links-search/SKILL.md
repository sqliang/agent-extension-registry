---
name: obsidian-links-search
description: 显式调用后，在指定 Obsidian vault 中搜索与关键词相关的笔记段落。
---

# Obsidian Links Search

从当前 Skill 目录定位同级的 `obsidian-smart-links` 组件，并运行：

```bash
python3 ../obsidian-smart-links/scripts/analyze_links.py "<笔记名或路径>" --search "<关键词>" --limit <数量>
```

先确认目标笔记、关键词和可选数量。若无法定位同级组件，停止并报告依赖缺失。
