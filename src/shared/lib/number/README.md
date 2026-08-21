# 普通数值运算

- 职责：提供 UI 几何、动画等非金融 `number` 的基础加减乘除。
- 入口：`index.ts` 导出 `numberAdd`、`numberSubtract`、`numberMultiply`、`numberDivide`。
- 约束：不得用于金额、价格、数量、收益或其他业务数据；除数为零会抛错。
- 扩展：金融或领域计算转入 `decimal` 与所属 entities/features。
- 验证：`number.test.ts` 与 `pnpm run test && pnpm run lint && pnpm run build`。
