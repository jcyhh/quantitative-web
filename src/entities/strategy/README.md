# 策略实体

- 职责：定义稳定的策略领域类型和未来策略数据能力。
- 入口：`index.ts` 当前导出 `StrategySummary`。
- 约束：DTO、领域模型和 UI Props 必须分层；收益、回撤等字段未来需明确单位、精度、舍入和时区。
- 扩展：策略 API、解析与领域计算放在本 slice 的 `api` 或 `model`，再从根入口公开。
- 验证：类型、解析或领域计算变更需补同目录测试，并运行 `pnpm run test && pnpm run lint && pnpm run build`。
