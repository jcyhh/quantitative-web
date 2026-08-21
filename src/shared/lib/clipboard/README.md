# 剪贴板

- 职责：通过已验证的 `copy-to-clipboard` 复制非空文本。
- 入口：`index.ts` 导出异步 `copyText`。
- 约束：业务模块不得直接使用原生 Clipboard API 或直接导入第三方库；调用方根据布尔结果展示本地化反馈。
- 扩展：只在保持单一复制能力时更新本模块，不在这里添加通知 UI。
- 验证：`clipboard.test.ts` 与 `pnpm run test && pnpm run lint && pnpm run build`。
