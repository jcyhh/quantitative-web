# 0008: Node 单元测试与 Vitest 组件测试分层

## Background

项目已经使用 Node Test Runner + `tsx` 覆盖纯 TypeScript 公共能力和仓库脚本，但不能运行 `.test.tsx`、渲染 React、模拟 DOM 交互或生成完整的分层覆盖率。直接把所有测试迁移到单一框架会产生与当前有效 Node 测试无关的大面积改动，也会让纯函数测试默认获得浏览器环境。

## Decision

- `.test.ts` 与 `.test.mjs` 继续使用 Node Test Runner，保持无 DOM 的轻量环境。
- `.test.tsx` 使用 Vitest 5、jsdom 和 Testing Library，覆盖 React 组件、Hook、Context、Effect 与用户交互。
- `tsconfig.test.json` 对两类测试执行统一的 strict TypeScript 检查；应用构建继续排除测试文件。
- Vitest 使用独立配置，不复用只允许 development、staging、production mode 的应用 Vite 配置。
- `.ts` 与 `.tsx` 覆盖率分别输出，CI 上传同一个 artifact，但不合并成一个总百分比。
- 首轮覆盖率只提供事实报告，不设置硬门槛；测试仍按业务风险和可观察行为补充。

## Alternatives considered

- **全部迁移到 Vitest：** 未采用。现有 Node 测试已经适合纯 TypeScript 与仓库脚本行为；迁移会扩大无关 diff，并模糊无 DOM 单测边界。
- **只保留 Node Test Runner：** 未采用。它不能直接提供项目所需的 React 19、jsdom 和 Testing Library 组件测试工作流。
- **立即增加全局覆盖率门槛：** 未采用。当前模板没有稳定覆盖率基线，任意百分比容易诱导无业务价值测试。
- **同时接入 E2E 与 MSW：** rejected because当前尚无稳定跨页面流程或必须跨真实 HTTP 边界的组件测试。

## Scope and trade-offs

两套运行器会带来两个 watch 命令和两份覆盖率报告，但换取了明确的 Node/DOM 环境边界。开发者通过统一的 `pnpm run test` 完成类型检查和全部测试；需要定位或持续开发时，再使用分层命令。真实浏览器、Canvas 像素、权限和 Electron 行为仍由后续专项验收负责。
