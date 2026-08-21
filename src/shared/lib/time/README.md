# 时间展示

- 职责：集中提供带 locale 和默认时区的日期时间展示。
- 入口：`index.ts` 导出时间函数与类型。
- 约束：业务和私有模块不得直接使用 `Date` 或 `Intl.DateTimeFormat`；市场或账户视图必须显式传入自身 IANA 时区。
- 扩展：日期比较、倒计时和交易日等能力须以真实需求独立设计，不在页面临时实现。
- 验证：新增时间行为时补就近测试，并运行 `pnpm run test && pnpm run lint && pnpm run build`。
