# 数值展示

- 职责：提供货币和百分比的 `Intl` 展示格式化。
- 入口：`format.ts` 导出 `formatCurrency` 与 `formatPercent`。
- 约束：仅用于展示；金额、价格、收益等计算必须留在领域模块并使用十进制能力。
- 扩展：新增展示格式时保持 locale 显式传入，不要在页面重复 `Intl` 调用。
- 验证：`pnpm run lint && pnpm run build`；新增边界格式时补测试。
