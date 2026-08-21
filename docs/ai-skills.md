# AI Skills 与 Agent 协作

本仓库面向多人、统一使用 Codex 的 AI 协作。统一性不依赖某个上下文的临时记忆，而由版本化规则、可复用流程和可执行检查共同保证：Markdown 定义语义与背景，Skill 编排任务步骤，Agent 在独立上下文中执行或审查，lint、测试与 CI 强制验证。

```text
需求 → 实现 Agent + Skill → lint / test / build → 只读 Review Agent + Skill → CI → 合并
```

## 规范来源与优先级

| 层 | 位置 | 职责 |
| --- | --- | --- |
| 不可违反的短规则 | `AGENTS.md` | 所有人工与 AI 协作者都必须遵守的入口约束。 |
| 详细规范 | `docs/*.md`、模块 README、ADR | 说明背景、边界、扩展步骤与未决决策。 |
| 团队 Skill | `.agents/skills/<name>/SKILL.md` | 将一类任务的读取、判断、实施与交接编排为可复用流程。 |
| 可执行策略 | lint、测试、CI | 阻断可机械判断的违规。 |

用户当前需求优先于上述所有项目规则；冲突必须在交接中说明，不能静默绕过。

## 团队 Skill

`.agents/skills/` 是唯一可提交、可审查的团队 Skill 源码。每个目录必须含有与目录同名的 YAML frontmatter `name` 和非空 `description` 的 `SKILL.md`，以及 `agents/openai.yaml`。后者提供 Codex UI 的显示名、简介、带 `$<skill-name>` 的默认提示词，并保持 `allow_implicit_invocation: true`，使 Skill 同时可自动匹配与显式调用；`pnpm run lint:ai-skills` 会验证此结构，并由 `pnpm run lint` 与 CI 运行。

| Skill | 使用场景 | 不负责 |
| --- | --- | --- |
| `quant-lab-feature-delivery` | 写或修复具体业务功能、页面逻辑与局部缺陷 | 改造公共能力/配置、只读审查 |
| `quant-lab-cross-cutting-change` | 封装或改造公共模块、路由、配置、共享能力与 Electron bridge | 普通局部业务功能实现 |
| `quant-lab-change-review` | 实现完成后对已有 diff 进行独立只读审查 | 修改文件、代替 lint/CI |
| `quant-lab-react-engineering` | React 状态、Effect、列表、图表、客户端加载、组件重构与渲染性能判断 | 纯样式/文案/非 renderer 配置；替代业务 Skill、性能测量或 lint |

所有代码任务统一在 Codex 中执行。成员从仓库根目录打开 Codex；Codex 先遵循 `AGENTS.md`，再按任务读取当前分支的匹配 Skill。`.agents/skills/` 是唯一团队源码，禁止复制到个人 Codex 配置、其他 AI 工具或聊天提示词中形成第二份可独立修改的规则。Codex 的本机安装 Skill 可以提供通用能力，但不能覆盖本仓库规则。

不要将外部下载的 skill 直接视为团队规范。先在隔离环境评估其触发范围、工具权限、脚本行为和与本仓库规则的冲突；确认后再以可审查的提交方式引入或提炼。

`quant-lab-react-engineering` 参考 Vercel Labs 的 `react-best-practices`，但只提炼适用于本仓库 Vite 客户端渲染器的状态、Effect、重渲染、异步依赖、列表和按需加载判断。Next.js、React Server Components、服务端缓存、第三方请求缓存、Tailwind/shadcn 建议，以及与 FSD 根入口冲突的导入建议均不随之引入。来源、取舍与后续更新原则见 [0005: React Skill 选型](./decisions/0005-react-skill-curation.md)。

## Agent 协作边界

| Agent 角色 | 写权限 | 责任 |
| --- | --- | --- |
| 实现 Agent | 任务范围内 | 使用匹配 skill 实现、验证并说明假设。 |
| Review Agent | 只读 | 在独立上下文审查已有 diff，输出证据化 findings。 |
| 集成 Agent | 仅在明确授权后 | 处理已确认 findings、运行最终验证、准备提交。 |

同一工作区内同一批文件同一时间只允许一个写入 Agent。并行工作应拆为不重叠模块，或使用独立分支/worktree；Review Agent 默认不写文件。任何 Agent 的最终交接至少包含：改动范围、已运行验证、未运行验证及原因、假设和待人工决策。

## 规则如何演进

发现问题后先判断其性质：可静态判断的规则进入 lint/测试；依赖任务上下文的步骤进入 skill；需要解释、取舍或长期记录的内容进入 Markdown/ADR。相同问题在真实任务中反复出现后再提升为全局规则，避免把一次偶发经历写成所有任务的负担。

## 从问题到团队知识

功能实现、缺陷修复和审查都必须判断：当前发现是否已经被证实、并且会改变未来实现选择。满足这两个条件才是应沉淀的团队知识；普通调试尝试、一次性日志、未复现的猜测和个人偏好不进入项目规则。

| 已确认问题的性质 | 必须沉淀到 | 同时留下的执行证据 |
| --- | --- | --- |
| 可机械判断的错误或回归 | lint 或就近测试 | 可重复运行的失败/通过结果 |
| 某模块私有但不直观的边界 | 模块 README、公共 API 注释或同目录说明 | 代码入口与验证方式 |
| 浏览器、Electron renderer、设备或运行时差异 | [兼容性契约](./compatibility.md) | 降级/清理/恢复测试与必要的人工复测矩阵 |
| 跨模块且长期有效的技术取舍 | ADR | 生效范围、替代方案与后果 |
| 确认有价值但当前不应实施的事项 | [待办](./todo.md) | 触发条件与不做原因 |

Skill 的责任不是替代这些知识，而是每次任务中触发判断并把 Codex 路由到正确位置。新发现必须在同一任务中更新对应记录和验证；如果证据不足，交接中说明观察与待验证条件，不把它写成强制规则。

修改团队 skill 时，必须在同一任务更新本文件、受影响的 `AGENTS.md`/协作文档或 ADR，并运行 `pnpm run lint:ai-skills`。新 skill 还应使用真实但隔离的任务样例进行一次人工或独立 Agent 验证。
