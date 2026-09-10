# 设备能力

- 职责：提供 PC、平板、H5 的设备分类、浏览器环境判断和原始设备诊断信息。
- 入口：从 `index.ts` 导入 `getClientType`、`detectClientType`、设备判断函数和诊断类型。
- 约束：设备判断只服务行为、接口 client 标识和运行时信息；页面布局必须由 CSS 媒体查询负责。诊断数据不包含页面展示文案，展示层自行使用 i18n。
- 扩展：新增浏览器/设备兼容性能力时先确认真实环境证据；不要把业务策略、Vue 依赖或通用 Hook 放入本目录。
- 验证：运行 `pnpm run test && pnpm run lint && pnpm run build`，并在目标浏览器/设备上复测实际分类。
