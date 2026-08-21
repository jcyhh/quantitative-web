# HTTP 客户端

- 职责：提供统一的 HTTP 请求、超时、参数编码、认证头和 `HttpError` 基础能力。
- 入口：`index.ts` 导出 `apiClient`、`ApiClient`、`HttpError` 与请求类型。
- 约束：业务模块不得直接调用 `fetch`；响应保持 `unknown`，由所属领域模块完成 DTO 校验和转换。
- 扩展：新增通用请求行为先确认适用于所有消费者；领域端点与 DTO 不放入本目录。
- 验证：变更请求行为时补就近测试，并运行 `pnpm run test && pnpm run lint && pnpm run build`。
