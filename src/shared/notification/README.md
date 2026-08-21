# 用户通知

- 职责：提供成功、提示、警告、错误和确认的统一用户反馈入口。
- 入口：`index.ts` 导出 `notification`。
- 约束：业务模块不得直接调用 `alert`、`confirm` 或 `prompt`；文案由调用方通过 i18n 提供，当前内部为原生对话框回退。
- 扩展：未来定制 Provider/UI 只能替换本模块内部，不改变业务调用入口。
- 验证：`model/notification.test.ts` 与 `pnpm run test && pnpm run lint && pnpm run build`。
