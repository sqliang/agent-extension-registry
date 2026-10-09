# Components

`components/` is the single source of reusable capabilities. Each component owns a `component.yaml` and its canonical source files. A Skill keeps the standard `SKILL.md` entry plus optional `references/`, `scripts/`, and `assets/` directories.

Supported kinds are `skill`, `agent`, `hook`, and `mcp`. Host-specific variants may be added under `hosts/<target>/` when the capability cannot be projected portably.

Do not add empty category or scenario components. Add a component only when a real, testable capability exists.
