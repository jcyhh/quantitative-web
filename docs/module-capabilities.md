# Quant Lab 模板技术选型与公共封装说明

## 项目技术选型

核心技术：

- React 19：负责页面与组件渲染，使用函数组件和 Hook 组织交互逻辑
- TypeScript 6：开启 strict 模式，为请求、领域模型、组件属性和公共能力提供静态类型约束
- Vite 8：负责开发服务器、环境模式校验、资源处理和 Web 构建
- React Router 7：负责语义化路由、页面懒加载和路由错误边界
- i18next 26 + react-i18next 17：统一管理中英文文案和语言切换
- Sass + CSS Modules：使用 SCSS 编写样式，通过模块作用域避免业务样式互相污染
- Electron 43 + electron-builder 26：复用同一套 React 渲染层构建桌面端，并负责安装包生成
- Feature-Sliced Design：按 `app → pages → widgets → features → entities → shared` 组织模块与依赖方向
- pnpm 10.28.2 + Node.js 22–24：固定包管理器和运行时范围，保证本地与 CI 安装结果一致
- Oxlint + Stylelint + Prettier：分别约束 TypeScript、SCSS 和代码格式，统一使用 4 空格缩进
- Node.js Test Runner + tsx：执行公共能力和脚本的轻量单元测试，不额外引入测试运行时框架

选型考虑：

- 优先保证量化业务的类型安全、金额计算精度和模块边界，而不是只追求快速搭页面
- Web 与 Electron 共用业务代码，桌面能力统一通过 preload 和受控 IPC 暴露
- 构建、格式、lint 和测试都提供固定命令，便于本地开发和 CI 使用同一套标准
- 当前不预装全局状态库、UI 组件库、图表库和请求缓存库，等真实业务场景明确后再选型，避免模板提前绑定技术方案

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
- API 超时正整数校验与 fallback
- 默认语言白名单校验与 fallback

```ts
sharedConfig.application.name
sharedConfig.api.baseUrl
sharedConfig.api.timeout
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

当前没有包含 Token 刷新、业务错误码映射、自动重试、缓存、请求去重和 WebSocket。

## 3. 精确金融计算

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

## 4. 普通数值计算

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

## 5. 数值展示格式化

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

## 6. 日期时间封装

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

## 7. LocalStorage 封装

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

## 8. 剪贴板封装

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

## 9. 文件下载封装

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

```ts
downloadText(JSON.stringify(strategy), 'strategy.json', 'application/json;charset=utf-8')
```

下载模块只负责浏览器触发。文件内容、文件名、MIME 类型、导出权限和敏感数据处理由调用方负责。

## 10. 用户通知封装

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

## 11. 主题系统封装

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

## 12. 多语言封装

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

## 13. PWA 安装生命周期

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

## 14. 项目常量封装

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

## 15. 公共 UI 封装

入口：`src/shared/ui`

三方库：`react`（`^19.2.8`）和 `react-i18next`（`^17.0.11`）；主题与数值格式化复用项目内部公共能力

当前提供：

- `MetricCard`
- `LanguageSwitcher`
- `ThemeSwitcher`

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

后续新增公共 UI 使用 `tld-<component>` 目录和 `Tld<Component>` React 导出名；业务组件不使用这个前缀。

## 16. 全局样式封装

入口：`src/app/styles/index.scss`

三方库：`sass`（`^1.102.0`）；CSS Modules 由 Vite 处理，样式规则由 Stylelint 检查

提供：

- `_colors.scss`：所有主题固定不变的颜色
- `_tokens.scss`：主题语义色、字号、圆角、阴影和布局 token
- `_fonts.scss`：Sans、Mono 字体栈和字体登记入口
- `_reset.scss`：浏览器默认样式归一
- `_init.scss`：根节点和页面基础样式
- `_mixins.scss`：1280px 紧凑桌面断点
- `_motion.scss`：View Transition 全局动效兜底
- `_utilities.scss`：`tld-` 前缀工具类

Utility 包含 Flex、Grid、1–12 列、尺寸、溢出、文本流、多行省略、Safe Area、间距、字号、gap 和 spacer。

```tsx
<div className="tld-flex tld-items-center tld-gap-10">...</div>
```

业务组件使用 `*.module.scss`，不能硬编码颜色，只能消费 `var(--color-*)`。Utility 不提供颜色、阴影、主题和业务状态。

当前只验收最低 1024px 的桌面端，1280px 是紧凑桌面断点；不做 px-to-rem、px-to-vw 或手机端结构。

## 17. 路由与应用骨架封装

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

## 18. Electron 桌面桥接封装

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

## 19. 工程约束封装

入口：

- `package.json`
- `.oxlintrc.json`
- `stylelint.config.mjs`
- `scripts/`
- `.github/workflows/ci.yml`

主要三方工具：

- 构建与类型：`vite`（`^8.2.0`）、`@vitejs/plugin-react`（`^6.0.4`）、`typescript`（`~6.0.2`）
- 格式与检查：`prettier`（`^3.9.6`）、`oxlint`（`^1.75.0`）、`stylelint`（`^17.14.1`）、`stylelint-config-standard-scss`（`^17.0.0`）、`postcss-scss`（`^4.0.9`）
- 测试执行：`tsx`（`^4.23.12`）和 Node.js 内置 Test Runner
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
- GitHub Actions lint、测试、Web 构建和 Electron 编译

当前自动测试覆盖语言 key、剪贴板、十进制运算、普通数值运算、通知入口和 PNG 资源迁移工具。现有测试环境还不包含 DOM 组件测试和 E2E。

## 20. 当前封装边界

这套模板已经把公共技术入口搭好，但下面这些仍不是已完成功能：

- 登录、权限和 Token 生命周期
- 真实策略管理和运行控制
- 回测任务、进度和结果
- 因子、数据集和研究任务
- 实时行情、WebSocket 和真实图表
- 组合、持仓、风险敞口和归因
- 下单、撤单和订单状态机
- 后端 DTO 校验和业务错误码映射
- 自定义通知 UI
- 完整 PWA 能力
- 移动端页面
- Electron 签名、公证和自动更新

后续业务开发应该优先复用上述公共入口，再在所属 `entities`、`features`、`widgets` 和 `pages` 中补充真实业务契约，避免在页面中重新实现一套请求、计算、时间、存储或浏览器能力。
