# Quant Lab 模板技术选型与公共封装说明

## 项目目录总览

```text
quantitative-web/
├── src/                 # React 应用源码，按 FSD 分层
│   ├── app/             # 应用启动、路由、Provider、全局样式和装配
│   ├── pages/           # 路由级页面，只负责组合下层模块
│   ├── widgets/         # 可跨页面复用的完整界面区块
│   ├── features/        # 用户可感知的业务动作，例如创建策略、运行回测
│   ├── entities/        # 稳定业务对象，例如策略、组合、持仓和金融标的
│   └── shared/          # 无业务归属的公共配置、工具、基础 UI 和基础设施
├── electron/            # Electron 主进程、preload 和桌面端桥接
├── public/              # 需要固定 URL 的公开静态资源，会原样进入构建产物
├── scripts/             # 仓库检查、开发启动和资源处理脚本
├── docs/                # 架构、开发、环境、测试和模块能力文档
├── .agents/             # 随仓库维护的 Codex 团队 Skill
└── .github/             # GitHub Actions 持续集成配置
```

`src` 内遵守 `app → pages → widgets → features → entities → shared` 的单向依赖：上层可以组合下层，下层不能反向引用上层；业务 slice 只通过自身根目录的 `index.ts` 暴露公共入口。

`electron` 是 React 应用的桌面宿主，不属于 `src` 内的 FSD 层。桌面能力只能通过受限 preload 和具名 IPC 暴露，React 页面不能直接导入 Electron 或 Node.js API。

`public` 只存放确实需要固定 URL 的发布资源。业务图片、图标和视频应跟随所属 FSD 模块放入局部 `assets/`，不能把 `public` 或全局 `src/assets` 当作资源收纳目录。

`node_modules/`、`.pnpm-store/`、`dist/` 和 `release/` 分别是依赖、缓存、Web/Electron 编译结果和桌面安装包目录，均由安装或构建命令生成，不属于手写源码，也不应提交到 Git。

### Hook 是什么、放在哪里

Hook 是以 `use` 开头的函数，用来封装可复用的 React 状态、生命周期、事件处理和业务操作。它不直接渲染页面，而是把状态和操作返回给组件使用。

项目不建立统一的 `src/hooks` 收纳目录。Hook 跟随它服务的模块：运行回测等业务操作放在 `features/<feature>/model`，页面或 Widget 私有 Hook 留在所属模块，跨业务的主题、语言和浏览器能力才放在命名明确的 `shared` 能力中。

判断归属时先确认 Hook 服务哪个模块。只有出现第二个真实的跨业务消费者，才考虑把它下沉到 `shared`。

## 项目技术选型

核心技术：

- React 19：负责页面与组件渲染，使用函数组件和 Hook 组织交互逻辑
- TypeScript 6：开启 strict 模式，为请求、领域模型、组件属性和公共能力提供静态类型约束
- Vite 8：负责开发服务器、环境模式校验、资源处理和 Web 构建
- React Router 7：负责语义化路由、页面懒加载和路由错误边界
- i18next 26 + react-i18next 17：统一管理中英文文案和语言切换
- Sass + CSS Modules：使用 SCSS 编写样式，通过模块作用域避免业务样式互相污染
- Electron 43 + electron-builder 26：复用同一套 React 渲染层构建桌面端，并负责安装包生成
- ECharts 6.1：通过 `shared/ui/tld-echart` 提供按需注册的类型化图表组件
- `@amap/amap-jsapi-loader` 1.0.1：按需加载高德地图 JS API 2.0，由 `shared/lib/amap` 隔离 SDK 与业务代码
- Feature-Sliced Design：按 `app → pages → widgets → features → entities → shared` 组织模块与依赖方向
- pnpm 10.28.2 + Node.js 22.22.2+/24.x：固定包管理器和运行时范围，保证本地与 CI 安装结果一致
- Oxlint + Stylelint + Prettier：分别约束 TypeScript、SCSS 和代码格式，统一使用 4 空格缩进
- Node.js Test Runner + tsx：执行 `.test.ts` 公共能力和 Node 脚本测试
- Vitest + jsdom + Testing Library：执行 `.test.tsx` React 组件、Hook 和 DOM 交互测试

选型考虑：

- 优先保证量化业务的类型安全、金额计算精度和模块边界，而不是只追求快速搭页面
- Web 与 Electron 共用业务代码，桌面能力统一通过 preload 和受控 IPC 暴露
- 构建、格式、lint 和测试都提供固定命令，便于本地开发和 CI 使用同一套标准
- 当前不预装全局状态库、UI 组件库和请求缓存库；图表统一通过 `shared/ui/tld-echart` 使用 ECharts，避免业务页面直接绑定底层实例

这个模板重点封装的是“公共基础能力”，让后续业务页面不要直接碰浏览器 API、浮点计算、主题 DOM 或底层请求。

## 1. 公共配置封装

入口：`src/shared/config`

三方库：无直接运行时依赖；环境变量由 Vite 的 `import.meta.env` 注入

提供：

- 应用名称
- Vite mode
- 部署环境
- API 基础地址
- API 默认超时
- 默认语言和支持语言
- 默认展示时区
- 默认页码和分页大小
- 最大分页大小
- Storage 键名
- 支持主题和默认主题
- Socket Ticket 路径、连接超时和重连延迟
- 高德 Web Key、安全密钥、JS API 版本和导航来源
- API 超时正整数校验与 fallback
- 默认语言白名单校验与 fallback

```ts
sharedConfig.application.name
sharedConfig.api.baseUrl
sharedConfig.api.timeout
sharedConfig.amap.webKey
sharedConfig.amap.securityJsCode
sharedConfig.time.defaultTimeZone
sharedConfig.pagination.defaultPageSize
sharedConfig.storageKeys.theme
```

这里放环境值、默认值、开关和存储键。用户文案放 i18n，稳定项目标识放 constants，策略状态和金融标的留在业务模块。

## 2. HTTP 请求封装

入口：`src/shared/api`

三方库：无，基于浏览器原生 Fetch API、`URL`、`Headers` 和 `AbortController`

提供：

- `apiClient.get/post/put/patch/delete`
- 自动拼接 `baseUrl`
- 查询参数与数组参数编码
- 自动跳过 `null`、`undefined` 查询值
- 普通对象自动序列化成 JSON
- 支持 Blob、FormData、URLSearchParams 等原生 Body
- 自动设置 `Accept`、`Content-Type`
- Bearer Token 注入
- 默认超时和单次请求超时覆盖
- 外部 `AbortSignal` 取消
- JSON、文本和 204 响应解析
- 非 2xx 统一抛出 `HttpError`
- 请求结束后清理定时器和监听器

```ts
const result = await apiClient.get<unknown>('/strategies', {
    params: {
        page: 1,
        status: ['running', 'paused'],
    },
    timeout: 10_000,
})
```

这里故意不封装业务接口和 DTO。API 返回值需要在 `entities` 或 `features` 中校验并转换，不能只依赖泛型断言。

当前没有包含 Token 刷新、业务错误码映射、缓存、请求去重和业务领域 API；Socket Ticket 请求复用该客户端的认证头，连接生命周期由 `shared/socket` 负责。

## 3. 设备能力

入口：`src/shared/lib/device`

提供 PC、平板、H5 的 client 类型判断、桌面/平板/手机布尔判断、iOS/微信环境判断和原始设备诊断数据。检测结合 UA、触摸能力、屏幕尺寸和指针能力，保留对 iPad 桌面模式、鸿蒙平板和触摸 Windows 设备的边界处理。

设备检测只用于接口 client 标识、运行时行为和诊断；页面布局使用 CSS 媒体查询，不使用设备类型进行整页 rem 缩放。诊断数据不包含中文展示文案，页面应通过 `shared/i18n` 展示。

## 4. WebSocket 连接能力

入口：`src/shared/socket`

基于 Socket.IO 1.7.4 提供 `socketClient` 和 `SocketClient` 工厂，统一完成 `/game-wss/ticket` Ticket 请求、Ticket 字段校验、WebSocket-only 握手、join 响应、消息订阅、连接状态和使用新 Ticket 的自动重连。

业务调用方只传递 `SocketTarget` 和展示用 `userInfo`，之后通过 `onMessage` 订阅消息、通过 `send` 发送业务 envelope。Ticket 返回的 URL、path、频道和角色是唯一信任源，Ticket 不写入环境变量或存储。

该能力不包含 PK 业务事件、presence、rank、倒计时或领域状态；这些内容应在后续 feature/entity 中定义并通过共享连接入口使用。真实 Ticket 联调需要已认证的 API 环境。

## 5. 精确金融计算

入口：`src/shared/lib/decimal`

三方库：`decimal.js`（依赖范围 `^10.6.0`，当前锁定版本 `10.6.0`）

提供：

- `decimalAdd`
- `decimalSubtract`
- `decimalMultiply`
- `decimalDivide`
- `string | number` 输入
- 字符串结果
- 40 位有效数字
- `ROUND_HALF_UP` 舍入方式
- 除数为零时抛出 `RangeError`

```ts
decimalAdd('0.1', '0.2')
// '0.3'

decimalMultiply('12.35', '20')
// '247'
```

底层使用 `decimal.js` 完成任意精度十进制运算，并通过项目封装统一固定精度、舍入方式、输入输出和除零行为。业务模块不能直接导入该三方库。

这个模块只解决 JavaScript 二进制浮点误差，不定义收益率、回撤、手续费、仓位等业务公式。领域公式仍放在对应 `entities` 或 `features` 中。

金融 API 数据和计算输入优先使用字符串，避免进入计算前就损失精度。

## 6. 普通数值计算

入口：`src/shared/lib/number`

三方库：无，基于 JavaScript 原生 `number`

提供：

- `numberAdd`
- `numberSubtract`
- `numberMultiply`
- `numberDivide`
- 除数为零检查

```ts
const centerX = numberAdd(rect.left, numberDivide(rect.width, 2))
```

这个模块只允许用于 UI 几何、像素、坐标和动画，不能用于金额、价格、数量、收益或其他业务数据。

项目还会检查私有 TS/TSX 中的原始四则运算，要求调用方明确选择 `decimal` 或 `number`，而不是在业务代码里随意计算。

## 7. 数值展示格式化

入口：`src/shared/lib/format.ts`

三方库：无，基于浏览器原生 `Intl.NumberFormat`

提供：

- `formatPercent`
- `formatCurrency`
- locale 配置
- 百分比小数位配置
- 货币币种配置

```ts
formatPercent(0.1842, 2, 'zh-CN')
// '18.42%'

formatCurrency(1_284_560, 'CNY', 'zh-CN')
// '¥1,284,560'
```

格式化模块只负责最终展示，不参与金融计算。调用方需要传入当前语言环境。

## 8. 日期时间封装

入口：`src/shared/lib/time`

三方库：无，基于浏览器原生 `Date` 和 `Intl.DateTimeFormat`

提供：

- `formatDateTime`
- 支持 `Date`、数字时间戳和字符串输入
- locale 格式化
- 默认 `Asia/Shanghai` 时区
- 自定义 IANA 时区
- 空值和非法日期 fallback
- 原生 `Intl.DateTimeFormatOptions` 配置

```ts
formatDateTime(value, locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Shanghai',
    fallback: '--',
})
```

业务模块不能直接使用 `Date` 或 `Intl.DateTimeFormat`，需要新增时间能力时先扩展这个模块。

当前只封装时间展示，没有日期比较、倒计时、交易日历和交易时段。交易日历属于市场领域，不应直接放进 `shared/lib`。

## 9. LocalStorage 封装

入口：`src/shared/lib/storage`

三方库：无，基于浏览器原生 Web Storage API

提供：

- `storage.get`
- `storage.set`
- `storage.remove`
- `storage.clearAppStorage`
- `StorageSchema` 键值类型约束
- JSON 序列化与反序列化
- 旧版本纯字符串数据兼容
- 非浏览器环境安全返回
- 只清除本项目登记键的定向清理

```ts
storage.set(sharedConfig.storageKeys.theme, 'dark')

const theme = storage.get(sharedConfig.storageKeys.theme)

storage.remove(sharedConfig.storageKeys.theme)
```

当前登记了语言、主题、PWA 安装状态和 Access Token。业务代码不能直接访问 LocalStorage 或 SessionStorage，也不能使用 `localStorage.clear()`。

新增键时要同时更新 `sharedConfig.storageKeys`、`StorageSchema`、测试和模块说明。

## 10. 剪贴板封装

入口：`src/shared/lib/clipboard`

三方库：`copy-to-clipboard`（依赖范围 `^4.0.2`，当前锁定版本 `4.0.2`）

提供：

- `copyText`
- 统一使用 `copy-to-clipboard`
- 空字符串检查
- `Promise<boolean>` 结果

```ts
const copied = await copyText(strategyId)

if (copied) {
    notification.success(t('strategy.copySuccess'))
}
```

业务模块不能直接调用原生 Clipboard API、`document.execCommand` 或直接导入 `copy-to-clipboard`。

这个模块只负责复制，成功或失败提示由调用方根据真实结果和当前语言处理。

## 11. 文件下载封装

入口：`src/shared/lib/download`

三方库：无，基于浏览器原生 `Blob`、`URL` 和 DOM API

提供：

- `downloadFile`
- `downloadText`
- Blob 下载
- 已有 URL 下载
- 文本内容生成 Blob
- 临时 `<a>` 元素创建和移除
- Object URL 创建和异步回收
- PDF、TXT、JSON、XML、XHTML、SVG 等可内联 MIME 的下载 Blob 转为 `application/octet-stream`

```ts
downloadText(JSON.stringify(strategy), 'strategy.json', 'application/json;charset=utf-8')
```

下载模块只负责浏览器触发。文件内容、文件名、MIME 类型、导出权限和敏感数据处理由调用方负责。Blob 下载会设置 `download` 属性，并对可内联展示的 MIME 使用附件型 MIME，尽量避免 PDF/TXT 被浏览器直接打开；跨域已有 URL 是否下载仍取决于服务端的 `Content-Disposition: attachment`，因为浏览器可能忽略跨域链接的 `download` 属性。

## 12. 用户通知封装

入口：`src/shared/notification`

三方库：无，当前临时使用浏览器原生 `alert` 和 `confirm`

提供：

- `notification.success`
- `notification.info`
- `notification.warning`
- `notification.error`
- `notification.confirm`

```ts
notification.success(t('strategy.saved'))

const confirmed = notification.confirm(t('strategy.confirmDelete'))
```

业务模块不能直接调用 `alert`、`confirm` 或 `prompt`，通知文案必须由调用方通过 i18n 提供。

当前内部仍使用浏览器原生对话框。以后可以在 `shared/notification` 内替换为 Toast、通知队列或自定义确认框，不需要修改业务侧调用入口。

## 13. 主题系统封装

入口：

- `src/shared/config/theme.ts`
- `src/shared/theme`
- `src/app/styles/_tokens.scss`

三方库：`react`（`^19.2.8`）和 `react-dom`（`^19.2.8`）；动画使用浏览器原生 View Transitions API

提供：

- `dark`、`light` 两个主题
- 默认深色主题
- `isSupportedTheme` 类型守卫
- `initializeTheme` 首屏初始化
- `ThemeProvider`
- `useAppTheme`
- 主题 LocalStorage 持久化
- 根元素 `data-theme` 更新
- 浏览器 `theme-color` Meta 同步
- `useThemeTransition` 圆形扩散动画
- 自定义动画起点、时长和开关
- 不支持 View Transition 时自动降级
- 用户偏好减少动态效果时自动降级

```ts
const { theme } = useAppTheme()
const changeTheme = useThemeTransition({ originRef: selectRef })

changeTheme(theme === 'dark' ? 'light' : 'dark')
```

业务组件不直接修改主题 DOM，也不自行调用 `document.startViewTransition`。组件样式只使用语义 `--color-*` token，不根据 `dark`、`light` 写业务分支。

新增主题时要同步主题注册、完整 token、中英文主题名和已有页面验证。

## 14. 多语言封装

入口：`src/shared/i18n`

三方库：`i18next`（`^26.3.6`）和 `react-i18next`（`^17.0.11`）

提供：

- i18next 与 react-i18next 初始化
- 简体中文 `zh-CN`
- English `en-US`
- 环境默认语言
- 用户语言 LocalStorage 持久化
- `useAppLanguage`
- 支持语言校验
- 中英文叶子 key 一致性测试
- 策略、组合、持仓、回测、收益、回撤等公共量化术语
- 导航、布局、主题、仪表盘和错误页文案

```ts
const { language, changeLanguage } = useAppLanguage()

changeLanguage('en-US')
```

开发和预发布默认中文，生产默认英文；用户保存过的语言优先于环境默认值。

所有用户可见文本都应进入语言包。新增文案必须同时补充中文和英文，新增语言必须完整补齐所有 key。

## 15. PWA 安装生命周期

入口：`src/shared/lib/pwa`

三方库：仅使用 `react`（`^19.2.8`）管理 Hook 状态；安装能力基于浏览器原生 PWA 事件，未引入 PWA 插件或 Workbox

提供：

- `initializePwaInstallLifecycle`
- `usePwaInstall`
- `isPwaStandaloneMode`
- `isPwaInstallSupportedEnvironment`
- standalone 状态判断
- 安全上下文和 Service Worker 能力判断
- 支持浏览器环境判断
- `beforeinstallprompt` 事件缓存
- `appinstalled` 事件处理
- 安装状态持久化
- 多组件共享安装状态
- `accepted`、`dismissed`、`unavailable` 安装结果

```ts
const { canInstall, isInstalled, supportsInstall, install } = usePwaInstall()
```

当前项目没有真正启用 PWA，不包含 manifest、Service Worker、离线缓存、安装按钮和更新策略。这一层只是安装生命周期预留。

## 16. 项目常量封装

入口：`src/shared/constants`

三方库：无

提供：

- 项目短名 `Quant Lab`
- 项目缩写 `QL`
- favicon 固定路径
- SVG 图标集合固定路径

```ts
projectConstants.shortName
projectConstants.abbreviation
projectConstants.assets.faviconPath
projectConstants.assets.iconSpritePath
```

常量模块只放跨页面稳定且不随环境变化的项目标识，不放环境配置、用户文案或领域数据。

## 17. 公共 UI 封装

入口：`src/shared/ui`

三方库：`react`（`^19.2.8`）、`react-i18next`（`^17.0.11`）和 `echarts`（`^6.1.0`）；主题与数值格式化复用项目内部公共能力

当前提供：

- `MetricCard`
- `LanguageSwitcher`
- `ThemeSwitcher`
- `TldEChart`

`MetricCard` 封装标签、主要值、变化信息、正负趋势样式和附加内容：

```tsx
<MetricCard
    label={t('dashboard.totalReturn')}
    value={formatPercent(returnRate, 2, locale)}
    change={t('dashboard.returnChange')}
    trend="positive"
/>
```

指标计算、业务口径、格式化和本地化由调用方负责，公共组件不理解具体策略或组合业务。

`LanguageSwitcher` 和 `ThemeSwitcher` 分别复用统一的语言、主题状态，不自行维护另一套配置或 Storage。

`TldEChart` 负责 ECharts 实例的初始化、option 更新、尺寸监听和卸载销毁；页面只传递类型化 option 与可访问名称：

```tsx
import { useMemo } from 'react'
import { TldEChart, type EChartOption } from 'src/shared/ui/tld-echart'

const option: EChartOption = useMemo(
    () => ({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: ['周一', '周二', '周三'] },
        yAxis: { type: 'value' },
        series: [{ type: 'line', data: [120, 132, 101] }],
    }),
    [],
)

return <TldEChart option={option} ariaLabel="收益曲线" height={280} />
```

颜色应读取 `readEChartCssVariable('--color-positive')` 等语义 token；业务数据、空态、错误态和单位说明留在所属 page/widget 或实体/功能模块。完整边界与按需注册说明见 [`src/shared/ui/tld-echart/README.md`](../src/shared/ui/tld-echart/README.md)。

后续新增公共 UI 使用 `tld-<component>` 目录和 `Tld<Component>` React 导出名；业务组件不使用这个前缀。

## 18. 全局样式封装

入口：`src/app/styles/index.scss`

三方库：`sass`（`^1.102.0`）；CSS Modules 由 Vite 处理，样式规则由 Stylelint 检查

提供：

- `_colors.scss`：所有主题固定不变的颜色
- `_tokens.scss`：主题语义色、字号、圆角、阴影和布局 token
- `_fonts.scss`：Sans、Mono 字体栈和字体登记入口
- `_reset.scss`：浏览器默认样式归一
- `_init.scss`：根节点和页面基础样式
- `_mixins.scss`：H5、平板、桌面和 1279px 紧凑桌面边界
- `_motion.scss`：View Transition 全局动效兜底
- `_utilities.scss`：`tld-` 前缀工具类

Utility 包含 Flex、Grid、1–12 列、尺寸、溢出、文本流、多行省略、Safe Area、间距、字号、gap 和 spacer。

```tsx
<div className="tld-flex tld-items-center tld-gap-10">...</div>
```

业务组件使用 `*.module.scss`，不能硬编码颜色，只能消费 `var(--color-*)`。Utility 不提供颜色、阴影、主题和业务状态。

### 为什么不使用 Tailwind CSS

- 设计稿的常规尺寸需要直接使用 px，不需要再经过 Tailwind 的尺寸映射
- 项目要求颜色全部来自语义化 `--color-*` token，避免颜色、阴影和业务状态通过任意 Utility 分散到 JSX
- CSS Modules 与所属 FSD 模块就近维护，能够直接看出样式归属，功能删除时也更容易完整清理
- 高频的 Flex、Grid、间距、字号和文本流已经由受控的 `tld-*` Utility 提供，无需同时维护两套 Utility 体系
- 复杂组件视觉保留在 `*.module.scss`，比长串 className 更适合表达量化表格、面板和状态组合
- Stylelint 已能检查原始颜色、class 命名和重复 Utility，让当前样式边界可以在 CI 中直接执行
- 当前采用 SCSS + CSS Modules 覆盖 Web 端 PC、平板和 H5 的受控响应式场景；引入完整的响应式 Utility 框架收益有限，还会增加依赖、配置和升级成本

这不是否定 Tailwind CSS，而是当前项目优先选择“SCSS + CSS Modules + 语义 Token + 受控 Utility”的组合。若未来出现大量页面快速搭建、统一 Utility 设计系统或更多响应式场景，应单独评估迁移方案，不能让 Tailwind 与现有规则长期并行。

当前 Web 端验收 H5、平板和桌面端，断点为 `<768px`、`768px–1023px`、`>=1024px`，1279px 及以下为紧凑桌面、1280px 起为完整桌面；不做 px-to-rem、px-to-vw 或整页等比缩放。

## 19. 路由与应用骨架封装

入口：

- `src/app/config/routes.ts`
- `src/app/config/navigation.ts`
- `src/app/router/router.tsx`
- `src/widgets/app-layout`

三方库：`react`（`^19.2.8`）、`react-dom`（`^19.2.8`）和 `react-router-dom`（`^7.18.2`）

提供：

- 集中的路由路径常量
- 集中的导航配置
- HTML5 History 路由
- 页面懒加载
- 统一加载状态
- 路由错误页
- 未知路径回到仪表盘
- 侧栏、顶栏、主题/语言入口和页面 Outlet

当前路由包含仪表盘、策略管理、研究中心、组合与持仓、系统设置。只有仪表盘具有静态展示骨架，其他页面仍是本地化占位。

路由层只负责装配，不承载请求和业务状态。资源 ID 使用 `/strategies/:strategyId` 这样的语义路径参数，不能放进 `?id=`。

## 20. Electron 桌面桥接封装

入口：

- `electron/main.ts`
- `electron/preload.cts`
- `electron-builder.yml`

三方库：`electron`（`^43.4.1`）和 `electron-builder`（`^26.15.3`）

提供：

- Web 和 Electron 共用 React SPA
- `quantlab://` 生产协议
- 静态资源加载与 History 回退
- renderer 文件路径范围校验
- 自定义协议 CSP
- context isolation
- process sandbox
- 关闭 renderer Node integration
- 拒绝新窗口和不可信导航
- IPC sender 来源校验
- Vite 与 Electron 开发进程协同启动
- macOS arm64/x64 DMG
- Windows x64 NSIS

当前 preload 只暴露：

```ts
window.quantLabDesktop.getAppVersion(): Promise<string>
```

新增桌面能力时必须增加一个用途明确的方法和对应 IPC handler，不能把 `ipcRenderer`、Node 模块或通用 channel 直接暴露给 React 页面。

当前没有配置签名、公证、自动更新和正式产品图标；桌面端连接后端前，还需要确定 API 地址、认证会话和网络策略。

## 21. 工程约束封装

入口：

- `package.json`
- `.oxlintrc.json`
- `stylelint.config.mjs`
- `scripts/`
- `.github/workflows/ci.yml`

主要三方工具：

- 构建与类型：`vite`（`^8.2.0`）、`@vitejs/plugin-react`（`^6.0.4`）、`typescript`（`~6.0.2`）
- 格式与检查：`prettier`（`^3.9.6`）、`oxlint`（`^1.75.0`）、`stylelint`（`^17.14.1`）、`stylelint-config-standard-scss`（`^17.0.0`）、`postcss-scss`（`^4.0.9`）
- 测试执行：`tsx`（`^4.23.12`）与 Node.js Test Runner 负责 `.test.ts`/`.test.mjs`；`vitest`（`5.0.0`）、`jsdom`（`29.1.1`）和 Testing Library 负责 `.test.tsx`
- 覆盖率：`c8`（`12.0.0`）统计 `.ts`，`@vitest/coverage-v8`（`5.0.0`）统计 `.tsx`
- 图片处理：`sharp`（`^0.35.3`），只由显式资源优化脚本使用

提供：

- Prettier 3.9.6 全仓库格式化
- `.editorconfig` 与 `.prettierrc.json` 统一 4 空格
- `pnpm run format` 自动写入格式
- `pnpm run format:check` 检查并接入 lint/CI
- pnpm 10.28.2 唯一执行器检查
- 非 pnpm 锁文件检查
- TypeScript strict
- `any`、非空断言和函数返回类型检查
- React Hooks 检查
- Storage、Date、通知、Clipboard 原生 API 限制
- `decimal.js`、`copy-to-clipboard` 直接导入限制
- 私有 TS/TSX 原始四则运算 AST 检查
- SCSS 原始颜色检查
- CSS class 小写短横线检查
- 重复 Utility 声明检查
- 公共模块 README 完整性检查
- 团队 AI Skill 完整性检查
- 大型静态 PNG 到 WebP 的显式迁移和失败回滚
- 测试源码 strict TypeScript 检查、Node 单测、React 组件测试和分层覆盖率报告
- GitHub Actions lint、测试覆盖率 artifact、Web 构建和 Electron 编译

当前自动测试覆盖语言 key、剪贴板、十进制运算、普通数值运算、设备判断、下载、位置转换、高德逆解析/选点/导航、通知入口、Socket 连接、语言切换组件、ECharts 与高德选点组件生命周期和 PNG 资源迁移工具。覆盖率分别输出到 `coverage/unit` 与 `coverage/component`；当前不设置百分比门槛，也不包含真实浏览器 E2E。

## 22. 位置能力封装

入口：`src/shared/lib/location`

三方库：无，基于浏览器 Geolocation API 和公共数值运算能力

提供：

- `getCurrentLocation`
- `wgs84ToGcj02`
- `LocationError`
- 浏览器原始坐标与 GCJ-02 坐标选择
- 坐标范围校验和标准化定位错误

默认调用返回浏览器 Geolocation API 提供的原始坐标（通常为 WGS-84）；需要提交国标地图服务时显式选择 GCJ-02：

```ts
import { getCurrentLocation } from 'src/shared/lib/location'

const browserCoordinate = await getCurrentLocation()
const gcj02Coordinate = await getCurrentLocation({ coordinateSystem: 'gcj02' })
```

该模块只处理浏览器定位、坐标校验和坐标转换，不负责权限弹窗、IP 定位、注册归属地、地图 SDK 或业务接口提交；页面应根据 `LocationError.code` 自行提供本地化反馈。完整错误码、定位参数和扩展边界见 [`src/shared/lib/location/README.md`](../src/shared/lib/location/README.md)。地图展示、地址逆解析和导航使用下一节的高德地图公共能力。

## 23. 高德地图公共能力

核心入口：`src/shared/lib/amap`

React 选点入口：`src/shared/ui/tld-amap-picker`

三方库：`@amap/amap-jsapi-loader@1.0.1`，运行时按需加载高德地图 JS API 2.0

提供：

- `reverseGeocodeAddress`：将 GCJ-02 经纬度解析为格式化地址、省、市、区县、乡镇/街道办、道路、门牌号、行政区划码和城市码。
- `TldAmapPicker`：展示地图、同步受控坐标、点击移动 Marker，并在逆解析完成后返回完整 `AmapPointSelection`。
- `buildAmapNavigationUrl`：生成高德官方导航 URI，支持起终点、驾车/公交/步行/骑行、坐标系和调起 App 参数。
- `openAmapNavigation`：在当前页或新窗口打开导航 URI；默认新窗口并尝试调起高德地图 App。
- `AmapError`：统一表达配置缺失、SDK 加载、坐标、参数和逆解析错误。

```ts
import { openAmapNavigation, reverseGeocodeAddress } from 'src/shared/lib/amap'

const coordinate = { longitude: 113.54, latitude: 34.82 }
const address = await reverseGeocodeAddress(coordinate)

function handleNavigate(): void {
    openAmapNavigation({ ...coordinate, name: address.formattedAddress })
}
```

`VITE_AMAP_WEB_KEY` 和 `VITE_AMAP_SECURITY_JS_CODE` 通过环境配置注入，但两者都会进入浏览器代码，只能使用受部署域名限制的 Web JS API 凭据。业务不得直接导入 Loader、读取 `window.AMap`、处理 SDK 原始响应或自行拼接导航 URL。公共模块、错误码、坐标约束和页面示例分别见 [`src/shared/lib/amap/README.md`](../src/shared/lib/amap/README.md)、[`src/shared/ui/tld-amap-picker/README.md`](../src/shared/ui/tld-amap-picker/README.md) 与 [环境配置](./environment.md#高德地图联调)。

## 24. 当前封装边界

这套模板已经把公共技术入口搭好，但下面这些仍不是已完成功能：

- 登录、权限和 Token 生命周期
- 真实策略管理和运行控制
- 回测任务、进度和结果
- 因子、数据集和研究任务
- 实时行情和真实图表
- 组合、持仓、风险敞口和归因
- 下单、撤单和订单状态机
- 后端 DTO 校验和业务错误码映射

- 自定义通知 UI
- 完整 PWA 能力
- Electron 签名、公证和自动更新

后续业务开发应该优先复用上述公共入口，再在所属 `entities`、`features`、`widgets` 和 `pages` 中补充真实业务契约，避免在页面中重新实现一套请求、计算、时间、存储或浏览器能力。
