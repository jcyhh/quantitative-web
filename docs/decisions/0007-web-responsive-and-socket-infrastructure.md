# 0007: Web 响应式与 Socket 连接基础设施

## Background

`quantitative-web` 原先只承诺桌面端，公共层也没有设备识别和实时连接能力。client 项目已经验证了 PC、平板、H5 的综合设备判断以及基于一次性 Ticket 的 Socket.IO 连接协议，但其中的实现混合了 Vue 响应式状态和 PK 业务事件，不能直接复制到 React 基础工程。

## Decision

- Web renderer 正式支持 PC、平板和 H5；Electron 继续只按桌面窗口验收。
- 页面布局采用 CSS-first：H5 `<768px`、平板 `768px–1023px`、桌面 `>=1024px`，`1279px` 及以下为紧凑桌面，`1280px` 起恢复完整桌面侧栏。
- 常规尺寸使用 px，连续变化的少数页面级尺寸使用 clamp；不使用 rem 根字号缩放或 px-to-rem 插件。
- 设备判断归入 `src/shared/lib/device`，只服务 client 标识、行为判断和诊断；布局不依赖 JS 设备分类。
- Ticket/Socket.IO 生命周期归入 `src/shared/socket`，只提供连接、握手、消息分发、状态和重连；PK 业务事件留在业务模块。
- 每次连接和重连都使用后端返回的新 Ticket；不从环境变量或固定地址回退。

## Alternatives considered

- **按设备类型选择整套 rem 布局：** 未采用。视口与布局能力更适合由 CSS 媒体查询表达；根字号缩放会让桌面设计稿尺寸、Electron 窗口和密集量化内容难以保持稳定。
- **使用原生 WebSocket：** 未采用。当前后端契约是 Socket.IO 1.7.4，并依赖其握手、path 和 query 行为。
- **迁移完整 PK Socket：** 未采用。这样会把业务事件、presence、rank 和倒计时耦合到 shared 基础设施；当前项目尚无对应业务消费者。

## Scope and trade-offs

本次适配 AppLayout 与 Dashboard，并建立可供后续业务使用的公共连接入口。真实 WebSocket 联调依赖 API 环境、登录 Token 和后端 Ticket 服务；在没有这些条件时，以 mock 单测、构建检查和浏览器视口验收保证基础层正确性。
