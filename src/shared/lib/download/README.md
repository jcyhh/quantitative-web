# 文件下载

- 职责：触发 Blob 或既有 URL 的浏览器下载，并负责临时 Object URL 回收。
- 入口：`index.ts` 导出 `downloadFile` 与 `downloadText`。
- 约束：调用方负责内容、MIME 类型、文件名和权限；不要自行创建 Object URL 或复制下载逻辑。
- 扩展：新增下载格式时优先由调用方生成内容，保持本模块只处理浏览器触发。
- 验证：涉及资源清理或浏览器行为时阅读兼容性契约，并运行 `pnpm run lint && pnpm run build`。
