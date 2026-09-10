# 测试规范

测试按**模块能力与可验证行为**组织，不按页面数量组织。测试文件变多是正常结果；无业务价值的“每页一个测试文件”才是需要避免的结果。

## 1. 归属与文件结构

测试与被测代码放在同一个 FSD slice、同一个能力目录附近。不要创建集中式 `tests/`、`__tests__/`、`test-utils/` 收纳目录，也不要把无关模块的测试混在一起。

```text
entities/strategy/
├── api/
│   ├── parse-strategy.ts
│   └── parse-strategy.test.ts       # DTO 校验和领域转换
├── model/
│   ├── calculate-return.ts
│   └── calculate-return.test.ts     # 公式、精度、边界
└── ui/
    ├── StrategyCard.tsx
    └── StrategyCard.test.tsx        # 只有真实交互或状态时才需要
```

- 文件命名固定为 `<被测概念>.test.ts` 或 `<被测组件>.test.tsx`。
- 一个测试文件只验证一个可命名的概念；同一概念的正常、边界和失败路径可以放在同一文件。
- 一个模块有多个独立行为时，建立多个测试文件；不要为了“一个模块一个文件”混入不相关的断言。
- 路由页面只是组合、无业务状态或交互时，不需要页面测试文件。它所组合的 feature、entity 和 widget 各自测试即可。
- 不测试私有实现细节、内部变量、CSS class 或实现顺序；测试公开输入、输出、状态和用户能观察到的行为。

## 2. 必须测试与按需测试

下列能力必须补单元测试，且测试与实现同一任务提交：

- 金额、价格、数量、收益、回撤、费率等领域公式：正常值、边界、精度、舍入、除零/非法输入和单位口径。
- API DTO 校验与 DTO 到领域模型转换：有效数据、缺字段、非法枚举、空值、时区和精度异常。
- 状态转换、权限判断、提交参数构造、错误映射和可复用公共模块。
- 修复过的缺陷：先写能够复现问题的测试，再修复实现。
- 已确认的兼容性回归：在拥有该能力的模块旁测试可观察的降级、超时、清理或状态恢复行为；测试无法覆盖的真实设备/运行时差异，必须在[兼容性契约](./compatibility.md)中记录人工复测环境和步骤。

下列测试按真实需求补充：

- Feature 或组件存在加载、空态、失败、提交、筛选、切换等用户行为时，写组件/集成测试。
- 跨页面的关键业务流程稳定后，用少量 E2E 测试覆盖入口路径；不要为每一个路由页面机械创建 E2E。
- 纯视觉布局、静态文案、无逻辑的容器组件通常不写自动化测试，交由设计验收和构建检查覆盖。

## 3. 当前测试边界

项目采用两层测试环境，文件扩展名同时决定运行器和运行环境：

| 文件类型    | 运行器                           | 适用范围                                      |
| ----------- | -------------------------------- | --------------------------------------------- |
| `.test.ts`  | Node Test Runner + `tsx`         | 纯函数、公式、DTO、解析、状态、配置和公共能力 |
| `.test.tsx` | Vitest + jsdom + Testing Library | React 组件、Hook、Context、Effect 和用户交互  |
| `.test.mjs` | Node Test Runner                 | 仓库脚本与 Node.js 基础设施                   |

`pnpm run test` 会先通过 `tsconfig.test.json` 对全部测试做严格类型检查，再依次执行 Node 和组件测试。Node 测试不会自动获得 DOM；组件测试使用 jsdom，但不能替代真实浏览器的布局、Canvas 像素、下载、权限和 Electron 验收。

资源源码迁移脚本的测试位于 `scripts/optimize-static-png-assets.test.mjs`，并由 `pnpm run test` 追加执行。测试使用临时目录和真实 `sharp` 编码，验证静态引用改写、APNG 跳过、体积比较和失败回滚；不得让测试迁移仓库内真实资源。

Vitest 使用独立的 `vitest.config.ts`，不合并应用 `vite.config.ts`，因为应用配置只接受 development、staging、production 三种 mode。`vitest.setup.ts` 只注册 jest-dom matcher 和 React cleanup；`ResizeObserver`、`matchMedia`、Storage、时间与网络等依赖由所属测试就近控制并恢复。

当前没有 E2E、真实浏览器组件测试和网络 Mock Server。首个稳定跨页面关键流程出现后，再独立评估 Playwright；首个必须跨真实 HTTP 边界的组件测试出现后，再评估 MSW。不要为了可能出现的需求提前增加依赖。

### 3.1 常用命令

```bash
pnpm run test:typecheck
pnpm run test:unit
pnpm run test:unit:watch
pnpm run test:component
pnpm run test:component:watch
pnpm run test
pnpm run test:coverage
```

- 日常提交前运行 `pnpm run test`，它包含测试类型检查和两类测试。
- 开发纯函数时使用 `pnpm run test:unit:watch`；开发组件时使用 `pnpm run test:component:watch`。
- `pnpm run test:coverage` 在 `coverage/unit` 与 `coverage/component` 分别生成终端、HTML 和 lcov 报告。两份报告按 `.ts`/`.tsx` 分层，不合并成一个总百分比。
- 覆盖率当前只报告，不设 CI 百分比门槛；未测试源码仍必须进入相应报告并显示为 0%。

### 3.2 Node 单元测试示例

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateReturn } from './calculate-return'

test('手续费大于收益时返回负收益', () => {
    assert.equal(calculateReturn({ grossReturn: '1', fee: '2' }), '-1')
})
```

### 3.3 React 组件测试示例

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { StrategyFilter } from './StrategyFilter'

test('选择运行中状态后展示对应策略', async () => {
    const user = userEvent.setup()
    render(<StrategyFilter />)

    await user.selectOptions(screen.getByRole('combobox'), 'running')

    expect(screen.getByText('运行中')).toBeInTheDocument()
})
```

组件测试优先通过角色、标签和值等用户可观察入口查询元素。不要断言 CSS Modules class、组件私有状态、Effect 调用顺序或大面积快照。第三方图表等重型实现只测试项目封装的输入、更新与清理契约，不测试第三方库内部绘制结果。

## 4. 测试写法

- 测试名称描述业务结果，例如“回测收益在手续费大于收益时返回负值”，不要描述内部函数调用。
- 每个测试只验证一个清晰场景；必要的相关断言可放在一起，避免把无关场景塞进同一测试。
- 使用最小、可读的测试数据。金融数据应直接标出单位和精度，不使用来源不明的大型 fixture。
- 时间、随机数、网络和 Storage 等外部依赖必须被受控；不要让测试依赖当前时间、真实接口、真实账户或执行顺序。
- 不以快照替代行为断言。快照仅在组件结构本身是稳定、可审查契约时，经明确理由后使用。
- 新增或修改测试时，运行 `pnpm run test`；涉及测试基础设施、类型、lint 或构建规则时同时运行 `pnpm run test:coverage`、`pnpm run lint` 与 `pnpm run build`。

## 5. AI 自检清单

1. 改动是否新增或改变了公式、解析、状态、公共能力或已修复缺陷？是则补同目录测试。
2. 测试是否归属于唯一模块和唯一概念，而不是为了页面数量创建？
3. 测试验证的是输入输出/可观察行为，而非私有实现？
4. `.test.ts` 是否保持 Node 环境，`.test.tsx` 是否只用于真实 React/DOM 行为？
5. 是否执行并报告 `pnpm run test`，以及改动范围需要的 lint/build？
