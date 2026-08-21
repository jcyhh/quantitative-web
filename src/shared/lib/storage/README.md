# Web Storage

- 职责：提供受 `StorageSchema` 约束的 LocalStorage 访问。
- 入口：`index.ts` 导出 `storage` 及其类型。
- 约束：这是项目唯一 Storage 入口；键名先登记到 `sharedConfig.storageKeys`，禁止 `localStorage.clear()`。
- 扩展：新增键时同步配置、Schema、行为测试和文档；业务模块不得直连浏览器 Storage API。
- 验证：变更读写语义时补就近测试，并运行 `pnpm run test && pnpm run lint && pnpm run build`。
