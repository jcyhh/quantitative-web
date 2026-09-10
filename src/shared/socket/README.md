# WebSocket 连接能力

- 职责：通过后端 Ticket 建立 Socket.IO 1.7.4 WebSocket 连接，完成 join 握手、消息解析、状态订阅、主动断开和带新 Ticket 的自动重连。
- 入口：从 `index.ts` 导入 `socketClient`，或使用 `createSocketClient` 对应的 `SocketClient` 构造函数创建独立实例。
- 约束：Ticket 返回的 URL、path、频道和权限是唯一信任源；业务不得直接导入 `socket.io-client`、读取 Ticket 或操作底层 Socket。这里不承载 PK 事件、presence、rank、倒计时和业务状态。
- 认证：Ticket 请求复用 `shared/api` 的 Bearer Token resolver，Token 通过 `shared/lib/storage` 获取；Ticket 不写入环境变量或持久化存储。
- 扩展：业务事件在所属 feature/entity 中定义，通过 `socketClient.send` 和 `socketClient.onMessage` 使用；若需要不同协议，先新增独立适配器，不修改当前 Ticket 契约。
- 验证：运行 `pnpm run test && pnpm run lint && pnpm run build`，并在有登录 Token 的开发环境复测实际 Ticket 和 WSS 握手。
