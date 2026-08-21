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
| 团队 Skill | `ai/skills/<name>/SKILL.md` | 将一类任务的读取、判断、实施与交接编排为可复用流程。 |
| 可执行策略 | lint、测试、CI | 阻断可机械判断的违规。 |

用户当前需求优先于上述所有项目规则；冲突必须在交接中说明，不能静默绕过。

## 团队 Skill

`ai/skills/` 是唯一可提交、可审查的团队 Skill 源码。每个目录必须含有与目录同名的 YAML frontmatter `name` 和非空 `description` 的 `SKILL.md`；`pnpm run lint:ai-skills` 会验证此结构，并由 `pnpm run lint` 与 CI 运行。

| Skill | 使用场景 | 不负责 |
| --- | --- | --- |
| `quant-lab-feature-delivery` | 单一业务功能、页面逻辑或缺陷修复 | 跨切面基础设施迁移、只读审查 |
| `quant-lab-cross-cutting-change` | 路由、i18n、主题、存储、环境、依赖、CI、共享能力、Electron bridge | 普通局部功能实现 |
| `quant-lab-change-review` | 已存在 diff 的独立只读审查 | 修改文件、代替 lint/CI |

所有代码任务统一在 Codex 中执行。成员从仓库根目录打开 Codex；Codex 先遵循 `AGENTS.md`，再按任务读取当前分支的匹配 Skill。`ai/skills/` 是唯一团队源码，禁止复制到个人 Codex 配置、其他 AI 工具或聊天提示词中形成第二份可独立修改的规则。Codex 的本机安装 Skill 可以提供通用能力，但不能覆盖本仓库规则。

不要将外部下载的 skill 直接视为团队规范。先在隔离环境评估其触发范围、工具权限、脚本行为和与本仓库规则的冲突；确认后再以可审查的提交方式引入或提炼。

## Agent 协作边界

| Agent 角色 | 写权限 | 责任 |
| --- | --- | --- |
| 实现 Agent | 任务范围内 | 使用匹配 skill 实现、验证并说明假设。 |
| Review Agent | 只读 | 在独立上下文审查已有 diff，输出证据化 findings。 |
| 集成 Agent | 仅在明确授权后 | 处理已确认 findings、运行最终验证、准备提交。 |

同一工作区内同一批文件同一时间只允许一个写入 Agent。并行工作应拆为不重叠模块，或使用独立分支/worktree；Review Agent 默认不写文件。任何 Agent 的最终交接至少包含：改动范围、已运行验证、未运行验证及原因、假设和待人工决策。

## 规则如何演进

发现问题后先判断其性质：可静态判断的规则进入 lint/测试；依赖任务上下文的步骤进入 skill；需要解释、取舍或长期记录的内容进入 Markdown/ADR。相同问题在真实任务中反复出现后再提升为全局规则，避免把一次偶发经历写成所有任务的负担。

修改团队 skill 时，必须在同一任务更新本文件、受影响的 `AGENTS.md`/协作文档或 ADR，并运行 `pnpm run lint:ai-skills`。新 skill 还应使用真实但隔离的任务样例进行一次人工或独立 Agent 验证。
