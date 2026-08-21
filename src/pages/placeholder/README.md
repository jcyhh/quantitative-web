# 占位页面

- 职责：为尚未实现的路由提供本地化的“即将推出”页面。
- 入口：`index.ts` 导出 `PlaceholderPage`。
- 约束：仅接受语言 key，不承载业务状态、请求或临时假数据。
- 扩展：真实功能落地后，用对应业务 page slice 替换该路由，不要继续向占位页堆积逻辑。
- 验证：`pnpm run lint && pnpm run build`。
