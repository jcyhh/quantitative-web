# 文件下载

- 职责：触发 Blob 或既有 URL 的浏览器下载，并负责临时 Object URL 回收。
- 入口：`index.ts` 导出 `downloadFile` 与 `downloadText`。
- 约束：调用方负责内容、MIME 类型、文件名和权限；不要自行创建 Object URL 或复制下载逻辑。
- 浏览器行为：Blob 源统一通过带 `download` 属性的临时 `<a>` 触发；`application/pdf`、`text/*`、JSON、XML、XHTML 和 SVG 等可内联展示的 MIME 会在创建 Object URL 前转换为 `application/octet-stream`，文件字节内容不变，以尽量避免浏览器直接打开文件。
- URL 边界：已有 URL 同样设置 `download` 属性，但跨域 URL 可能被浏览器忽略该属性；这种情况必须由服务端返回 `Content-Disposition: attachment`，或由调用方先通过具备 CORS/认证能力的 API 获取 Blob 后再传入本模块。
- 扩展：新增下载格式时优先由调用方生成内容，保持本模块只处理浏览器触发。
- 验证：涉及资源清理或浏览器行为时阅读兼容性契约，并运行 `pnpm run lint && pnpm run build`。
