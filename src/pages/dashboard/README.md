# 仪表盘页面

- 职责：展示当前仪表盘骨架、指标卡、活动和策略概览。
- 入口：`index.ts` 导出 `DashboardPage`。
- 约束：当前数据为静态骨架，不能被误认为真实行情或策略数据；未来请求和业务动作应下沉到 entities/features。
- 扩展：接入真实数据前先定义策略领域契约、加载/空/错误状态和所需 feature。
- 验证：`pnpm run lint && pnpm run build`；新增状态或数据转换时补就近测试。
