# 2026-09-10 本对话总变更说明

本文汇总本次对话在 `quantitative-web` 中实际落地的代码、配置、测试和文档变更，便于代码评审、交接和现场讲解。内容以提交前暂存区相对基线 `1b1fa0f` 的差异为准；`waxueshe-client-web` 仅作为设备、Socket 和位置能力的参考来源，没有被修改。

## 1. 一页总览

| 主题       | 变更前                     | 变更后                                                    | 主要入口                                               |
| ---------- | -------------------------- | --------------------------------------------------------- | ------------------------------------------------------ |
| 设备识别   | 当前项目无统一能力         | 提供 `pc / tab / h5`、桌面/平板/手机、iOS、微信和诊断信息 | `src/shared/lib/device`                                |
| Web 响应式 | 只承诺桌面端               | Web 支持 H5、平板、桌面；Electron 仍为桌面端              | `src/app/styles`、`AppLayout`、`DashboardPage`         |
| 实时连接   | 无公共 WebSocket 客户端    | 提供 Ticket 驱动的 Socket.IO 连接、join、消息、状态和重连 | `src/shared/socket`                                    |
| 图表       | 无统一图表入口             | 增加按需注册、主题化和自动清理的 `TldEChart`              | `src/shared/ui/tld-echart`                             |
| 下载       | 可内联文件可能被浏览器打开 | Blob 下载统一转附件型 MIME，并保留跨域服务端边界          | `src/shared/lib/download`                              |
| 定位       | 无公共定位与坐标转换       | 可选择浏览器原始坐标或 GCJ-02，统一错误类型               | `src/shared/lib/location`                              |
| 测试       | 只有 Node `.test.ts`       | Node 单测 + React 组件测试 + 分层覆盖率 + CI artifact     | `vitest.config.ts`、`tsconfig.test.json`、`.c8rc.json` |
| 文档与规范 | 公共能力说明不完整         | README、开发规范、测试规范、架构说明和 ADR 同步更新       | `README.md`、`docs/`、`AGENTS.md`                      |

## 2. 设备识别与响应式方案

### 2.1 设备公共能力

新增 `src/shared/lib/device`，保留 client 项目经过实际设备场景使用的综合判断思路，并按当前项目的严格 TypeScript 规则重构。

公共能力包括：

- 后端 client 类型：`pc | tab | h5`。
- 设备类型：`desktop | tablet | phone`。
- 综合使用 UA、触摸点、屏幕尺寸、粗细指针和 hover 能力判断。
- 兼容 iPad 桌面模式、Android/鸿蒙平板和触摸 Windows 笔记本等边界场景。
- 提供 iOS、微信环境判断以及不含展示文案的原始诊断数据。
- SSR/Node 环境中不访问不存在的 `window`、`navigator` 或 `screen`，使用稳定 fallback。

```ts
import { getClientType, getDeviceDiagnosticInfo } from 'src/shared/lib/device'

const clientType = getClientType()
const diagnostic = getDeviceDiagnosticInfo()
```

设备结果只用于接口标识、行为判断和诊断，不决定整页布局。

### 2.2 CSS-first 响应式布局

布局以 CSS 媒体查询为唯一事实来源，不使用 rem 根字号缩放、px-to-rem 插件或 JS 设备类型切换整套页面。

断点约定：

- `<768px`：H5。
- `768px–1023px`：平板。
- `>=1024px`：桌面。
- `<=1279px`：紧凑桌面/折叠侧栏。
- `>=1280px`：完整桌面侧栏。

当前页面改动：

- AppLayout 在完整桌面使用 232px 侧栏，在紧凑桌面和平板使用 64px 折叠侧栏。
- H5 将侧栏变为底部导航，内容区预留导航高度和 Safe Area。
- Dashboard 指标卡按桌面四列、平板两列、H5 单列排列。
- Dashboard 主内容在平板和 H5 变为单列。
- H5 标题与操作区域允许纵向排列，避免按钮溢出。
- 金融数据表保留最小可读宽度，外层负责横向滚动，不强行压缩列。
- 页面级间距、标题字号等连续尺寸使用少量 `clamp()`；常规设计尺寸继续使用 px。

## 3. WebSocket 共享连接层

新增与 `shared/api` 平行的 `src/shared/socket`，底层按现有后端契约使用 `socket.io-client@1.7.4`。

连接流程：

1. 业务传入 `SocketTarget` 与展示用 `userInfo`。
2. Socket 客户端通过 `apiClient` 请求 `/game-wss/ticket`；room 目标映射为 `room_id`。
3. 对未知 Ticket 响应执行运行时校验，拒绝非法 URL、path、scope、过期时间、Ticket 或频道。
4. 使用 Ticket 返回的 URL、path、Ticket 和频道建立 WebSocket-only 连接。
5. 连接成功后自动发送 `game.join` 或 `global.join`。
6. 只有 request ID 匹配的 joined 消息才能完成握手。
7. 后续 `message` 统一解析并分发给订阅者。
8. 异常断线按 5s、10s、20s、30s、60s 延迟重连，每次重连重新申请 Ticket。
9. 主动 `disconnect()` 清理定时器、监听器、连接与待处理状态，并禁止自动重连。

```ts
import { socketClient } from 'src/shared/socket'

const unsubscribe = socketClient.onMessage((message) => {
    // 将 message 交给所属 feature/entity 的业务事件解析器
})

await socketClient.connect({ scope: 'room', roomId: 1001 }, { nickname: 'Visitor' })

unsubscribe()
socketClient.disconnect()
```

业务发送消息时，将所属 feature/entity 按真实后端协议构造的 `SocketOutgoingMessage` 传给 `socketClient.send()`；shared 层不预设事件名称。认证由应用启动时为 `apiClient` 注册的 Access Token resolver 统一提供，Token 只能通过 `shared/lib/storage` 读取。Socket 层不保存 Ticket，不使用 `VITE_GAME_WSS_URL`，也不包含 PK、presence、rank、倒计时等业务逻辑。

## 4. ECharts 图表封装

新增 `echarts@6.1.0` 和公共组件 `TldEChart`：

- ECharts 模块按需注册，目前包含折线图、Grid、Tooltip 和 Canvas renderer。
- 组件负责实例初始化、option 更新、`ResizeObserver` 尺寸监听和卸载销毁。
- 页面通过 `EChartOption` 传递配置，不直接操作 ECharts 实例。
- 图表颜色通过 `readEChartCssVariable` 读取项目语义主题 token。
- Dashboard 原占位区域替换为真实折线图展示，数据当前仍是演示数据。
- `TldEChart` 名称保留 `tld-` / `Tld` 前缀，因为这是项目公共 UI 的强制命名规范。

```tsx
import { TldEChart, type EChartOption } from 'src/shared/ui/tld-echart'

const option: EChartOption = {
    xAxis: { type: 'category', data: ['周一', '周二'] },
    yAxis: { type: 'value' },
    series: [{ type: 'line', data: [100, 105] }],
}

return <TldEChart option={option} ariaLabel="收益曲线" height={280} />
```

完整使用说明见 [`src/shared/ui/tld-echart/README.md`](../src/shared/ui/tld-echart/README.md)。

## 5. 下载行为优化

`downloadFile` 继续统一通过临时 `<a download>` 触发下载并异步回收 Object URL，同时对浏览器常见的可内联 MIME 做附件化处理：

- `application/pdf`
- `text/*`
- JSON、XML、XHTML
- SVG

Blob 字节不变，仅在创建下载 Object URL 前将 MIME 设置为 `application/octet-stream`，尽可能避免 PDF、TXT 等内容进入浏览器预览器。

```ts
import { downloadFile, downloadText } from 'src/shared/lib/download'

downloadText('report content', 'report.txt')
downloadFile(new Blob([pdfBytes], { type: 'application/pdf' }), 'report.pdf')
```

已有跨域 URL 仍受浏览器安全策略限制：若浏览器忽略 `download` 属性，需要服务端返回 `Content-Disposition: attachment`，或先通过具备 CORS/认证能力的 API 获取 Blob 后再调用公共下载方法。

## 6. 浏览器定位与 GCJ-02

新增 `src/shared/lib/location`，从 client 项目提取浏览器当前定位与 WGS-84 → GCJ-02 转换，并移除 Vue、Element Plus、IP 定位和注册业务耦合。

```ts
import { getCurrentLocation } from 'src/shared/lib/location'

const browserCoordinate = await getCurrentLocation()
const gcj02Coordinate = await getCurrentLocation({ coordinateSystem: 'gcj02' })
```

能力边界：

- 默认返回浏览器 Geolocation API 的原始坐标。
- 显式选择 `gcj02` 时执行国标地图坐标转换；中国范围外坐标保持不变。
- 支持 `enableHighAccuracy`、`timeout` 和 `maximumAge` 参数。
- 使用 `LocationError.code` 统一表达不支持、权限拒绝、位置不可用、超时和非法坐标。
- 不负责权限 UI、地址反解析、地图 SDK、IP fallback 或业务接口提交。
- 实际浏览器定位通常要求 HTTPS/安全上下文并需要用户授权。

## 7. 单元测试与覆盖率基础设施

测试采用两层运行环境：

| 文件        | 运行器                           | 用途                                 |
| ----------- | -------------------------------- | ------------------------------------ |
| `.test.ts`  | Node Test Runner + `tsx`         | 纯函数、公共能力、解析、状态和配置   |
| `.test.tsx` | Vitest + jsdom + Testing Library | React 组件、Hook、Effect 和 DOM 交互 |
| `.test.mjs` | Node Test Runner                 | 仓库脚本和 Node 基础设施             |

新增内容：

- `tsconfig.test.json`：对两类测试执行 strict TypeScript 检查。
- `vitest.config.ts` / `vitest.setup.ts`：提供 jsdom、React、jest-dom 和自动 cleanup。
- `.c8rc.json`：统计 `.ts` 覆盖率；Vitest V8 provider 统计 `.tsx` 覆盖率。
- LanguageSwitcher 组件测试：验证语言切换和持久化。
- TldEChart 组件测试：验证初始化、option 更新、resize 和资源销毁。
- device、download、location、socket 等公共能力的就近 Node 测试。
- CI 执行覆盖率并上传 `test-coverage` artifact，保留 14 天。

常用命令：

```bash
pnpm run test
pnpm run test:unit
pnpm run test:component
pnpm run test:coverage
```

本次验证时共有 21 个 Node 测试场景和 2 个 React 组件测试通过。覆盖率只建立事实基线，暂不设置百分比门槛；HTML 报告分别输出到 `coverage/unit` 和 `coverage/component`。

完整规范和新增测试方法见 [`docs/testing-standards.md`](./testing-standards.md) 与 [`docs/decisions/0008-unit-and-component-testing.md`](./decisions/0008-unit-and-component-testing.md)。

## 8. 配置、依赖和工程约束

### 8.1 运行时依赖

- `echarts@^6.1.0`：公共图表组件。
- `socket.io-client@1.7.4`：与现有服务端协议严格保持版本兼容。

### 8.2 测试依赖

- Vitest 5、jsdom 29.1.1。
- Testing Library React、DOM、user-event、jest-dom。
- c8 与 Vitest V8 coverage provider。

jsdom 选择 29.1.1，是为了兼容当前开发机 Node 24.12；jsdom 30 对 Node 24 分支要求更高的补丁版本。项目与 CI 的 Node 范围同步调整为 `^22.22.2 || ^24.0.0`，CI 固定使用 22.22.2。

### 8.3 共享配置

`sharedConfig` 新增：

- Socket Ticket path。
- 10 秒连接超时。
- 5s、10s、20s、30s、60s 重连延迟。
- Access Token storage key。

没有新增 WSS 地址或 Ticket 类 `VITE_*` 变量；连接地址和权限只信任后端 Ticket。

## 9. 文档与长期决策

同步更新了以下文档层：

- 根 README：新增公共能力、测试命令、运行时和 CI 说明。
- 模块能力说明：登记设备、Socket、图表、下载、位置与测试基础设施。
- 开发规范与 AGENTS：Web 响应式范围统一为 PC、平板、H5，Electron 保持桌面端。
- 环境说明：明确 Socket 不通过环境变量配置固定地址。
- 测试规范：说明测试分层、命名、Mock、命令、覆盖率和未来 E2E/MSW 边界。
- ADR 0007：记录 CSS-first 响应式和 Ticket Socket 方向。
- ADR 0008：记录 Node 单测与 Vitest 组件测试分层。
- 各公共能力目录 README：说明职责、入口、约束、扩展点和验证方式。

## 10. 验证结果

提交前已通过：

```text
pnpm run test
pnpm run test:coverage
pnpm run lint
pnpm run build
pnpm run desktop:build
pnpm run format:check
pnpm run test:typecheck
git diff --check
```

已知非阻塞提示：Dashboard 构建 chunk 约 500.44 kB，略高于 Vite 默认 500 kB 警告线；构建仍成功，本次没有为了消除提示进行无业务依据的拆包。

## 11. 未纳入或仍需真实环境确认

- 没有迁移 PK 事件、presence、rank、倒计时和 observer 业务权限逻辑。
- 没有把 Socket 强行接入尚无实时业务需求的页面；真实 WSS 仍需登录 Token 和可用 Ticket 服务联调。
- 没有增加固定 WSS 环境变量、持久化 Ticket 或绕过 `apiClient`/storage 的认证读取。
- 没有增加 E2E、MSW 或覆盖率硬门槛；在首个稳定跨页面流程/真实 HTTP 组件场景出现后再评估。
- 响应式自动构建已通过，但 320、375、390、430、768、834、1024、1280、1440、1920 等目标视口仍建议在发布前做一次真实浏览器人工回归。
- 下载公共层无法替代跨域服务端的 `Content-Disposition` 配置。
- 浏览器定位权限、精度和 Electron renderer 权限仍需在目标运行环境确认。
- 最初出现的 GitHub 443 连接超时属于网络连通性问题；本次代码没有修改 Git remote、代理或凭据配置。

## 12. 建议讲解顺序

1. 先讲“一页总览”，说明这是一次公共基础设施补全，而不是单一页面改造。
2. 用响应式断点和 AppLayout 展示 Web PC/平板/H5 的产品范围变化。
3. 用 Socket Ticket 流程说明安全边界：后端 Ticket 是地址、频道与权限的唯一信任源。
4. 展示 Dashboard 的真实 ECharts 封装和主题 token 复用。
5. 展示下载、定位两个浏览器能力如何从页面散装逻辑收敛到 `shared/lib`。
6. 最后展示测试分层、CI 覆盖率 artifact 和全部验证结果，说明后续业务可以沿公共入口继续扩展。
