# Feature-Sliced Design（FSD）架构约定

项目采用 [Feature-Sliced Design（FSD）](https://fsd.how/docs/reference/layers/) 分层。它以影响范围和业务领域组织前端代码，适合长期多人协作；不引入已废弃的 `processes` 层。

Electron 主进程与 preload 位于仓库根目录 `electron/`，它们是加载 FSD React 渲染层的桌面宿主，不属于 `src` 内任一 FSD layer。业务逻辑、领域类型、页面和浏览器可用基础能力仍归入 `src` 的 FSD 分层；禁止将 Electron API 直接导入 renderer 代码。

标准层级从高到低为：`app → pages → widgets → features → entities → shared`。模块只能导入严格更低层的模块；同层不同业务 slice 不得互相导入。`app` 与 `shared` 是例外：它们不按业务 slice 划分，内部的技术 segments 可以互相引用。

路由使用 React Router 的 `createBrowserRouter`，即 HTML5 History 模式。生产部署必须为前端路由提供 `index.html` 回退，避免直接访问子路径时出现 404。

## URL 与路由约定

资源身份使用语义化路径参数，不使用查询参数承载 ID：策略详情使用 `/strategies/:strategyId`，组合详情使用 `/portfolios/:portfolioId`。不要建立脱离领域的通用 `/detail/:id` 路径；路径必须让资源类型一眼可见。

查询参数只表达**可选且可恢复的视图状态**，例如 `/strategies?status=running&page=2&sort=return-desc`。它不能替代资源主键；详情页可以在资源路径后附加可选视图参数，例如 `/strategies/:strategyId?tab=backtest`。筛选、排序、分页等真实需求首次出现时，再建立 `shared/lib/query-state`，统一处理解析、默认值、空值清理和 History 更新。

本项目当前是内部系统且 robots 为 `noindex`，因此 URL 约定当前首先服务于可读性、深链接与浏览器前进后退；若未来对外公开，再单独确认 SEO、服务端渲染/预渲染、canonical 等策略。

## FSD 分层职责

- `app`：应用启动、路由、全局 Provider、全局样式与应用装配。
- `pages`：路由页面 slice，只组装界面和功能模块。
- `widgets`：可跨页面复用的完整界面区块，例如导航、行情面板、策略列表。
- `features`：用户可感知的业务动作，例如创建策略、运行回测、调仓、导出报告。
- `entities`：稳定的业务对象及其模型、API、展示组件，例如 strategy、portfolio、instrument。
- `shared`：项目基础设施与高度可复用能力，例如 API 客户端、工具函数、基础 UI、环境连接和配置。`shared/config` 是 FSD 约定的标准位置，可存放环境变量、全局功能开关、默认分页和存储键；LocalStorage 通过 `shared/lib/storage` 统一访问。

`pages`、`widgets`、`features`、`entities` 中的每个业务 slice 均通过目录根部的 `index.ts` 对外暴露公共 API；其他 slice 不直接引用其内部文件。接口请求与领域类型跟随所属实体或功能模块，避免集中堆积在全局 services/types 目录。

`shared/config` 与 `shared/constants` 职责不同：前者放环境变量、可配置默认值和功能开关；后者放跨页面稳定且不随环境变化的项目标识，例如项目短名、缩写和公共静态资源路径。用户可见文字只在 `shared/i18n/locales` 维护；策略状态、订单类型、金融标的名称等领域数据仍留在所属 `entities` 或 API 数据中，不能因“看起来像常量”就下沉。

## 资源归属与提升规则

业务资源（插图、业务图标、模块私有图片、视频等）跟随**拥有它的 FSD 模块**，而不是集中放入 `src/assets`。`assets/` 是某一明确模块的配套资源目录，不是全项目收纳目录；不在资源首次出现前创建空目录。

```text
features/run-backtest/
├── ui/
│   ├── RunBacktestForm.tsx
│   └── RunBacktestForm.module.scss
└── assets/
    └── backtest-empty.svg       # 仅回测功能使用
```

资源的位置按以下顺序判断：

| 使用范围 | 正确位置 | 说明 |
| --- | --- | --- |
| 仅一个 page/widget/feature/entity 使用 | 该模块的 `assets/` | 页面只是组合时，资源应归真正拥有视觉或业务含义的子模块。 |
| 同一实体的多个模块使用 | `entities/<entity>/assets/` | 例如策略领域专属的状态图或标识。 |
| 跨业务模块且不含业务语义 | `shared/assets/<category>/` | 例如公共图标、通用插图；按 `icons`、`illustrations` 等概念分类。 |
| 固定 URL 的入口/部署资源 | `public/` | 例如 favicon、robots 或已确认的固定公开资源路径。 |
| 全局字体 | `app/styles` 所登记的字体资源位置 | 字体登记仍只由 `_fonts.scss` 管理。 |

同一资源出现**第二个真实消费者**时，执行提升，而不是复制：

1. 判断两个消费者共同允许依赖的最低层；同一实体归入该 entity，真正通用的视觉资源才归入 `shared/assets`。
2. 将原文件移动到目标目录，并由该目录 `index.ts` 导出资源 URL，例如 `export { default as emptyStateIllustration } from './empty-state.svg'`。
3. 所有消费者改从该公开入口导入，删除原位置文件；禁止保留副本。
4. 补充或迁移资源所属模块的测试/文档；若资源改变用户可见语义，同步语言包或组件文案。

其他模块不得深层导入同层业务模块的 `assets/`。跨模块使用只允许从已提升模块的 `index.ts` 公共入口导入。新增资源前，先检索 `shared/assets` 与相关 entity 的 `assets/`，例如 `rg --files src | rg '/assets/'`；不维护容易过期的全量资源清单。`shared/assets` 仅在首次真实跨业务复用时创建，禁止预建空的 `src/assets` 大仓库。

### 资源构建与清理

Vite 会将 `src` 中被 TS/TSX/SCSS **静态引用**的资源加入构建图；未被引用的 `src/**/assets/**` 文件通常不会进入 `dist`。这只是构建优化，不是允许随意保留文件的理由：未引用资源会增加仓库噪声、妨碍复用判断，也让删除变得不安全。

1. `src/**/assets/**` 中的资源必须通过静态 import 或 SCSS `url()` 使用；禁止用字符串拼接资源路径，也不要用“以后可能会用”保留未引用资源。
2. 替换或删除界面时，同一任务检查并删除不再引用的模块资源。删除前执行 `rg` 搜索文件名和导出名；删除后执行 `pnpm run build`，让静态引用缺失立即报错。
3. `public/` 中的文件会被 Vite 原样复制到 `dist`，即使没有任何代码引用。因此它是**发布清单**，不是缓存目录：只允许固定 URL 的入口或部署资源，且每个文件必须能在 `index.html`、`shared/constants`、Vite/部署配置之一找到明确用途。
4. 业务图片、图标、字体和模块插图默认放 `src` 并通过 import 使用；除非确实需要稳定且无 hash 的 URL，否则不得放进 `public/`。
5. 当前不对所有资源做“未引用即 lint error”的通用扫描：CSS URL、按模块导出的资源和未来受控的动态场景可能误报。资源数量与 `public` 内容出现真实规模后，再独立立项为 `public` 发布清单添加白名单 CI 校验；不得临时编写宽松扫描器并接入 build。

### `shared/lib` 基础能力边界

`shared/lib` 不等于 `utils` 收纳目录。每个目录都必须对应一个清晰的跨业务技术能力，并只通过自己的 `index.ts` 导出：

| 能力 | 入口 | 职责 |
| --- | --- | --- |
| 数值展示 | `shared/lib/format` | 金额、收益率等 `Intl` 展示格式化；不做业务计算。 |
| 十进制运算 | `shared/lib/decimal` | 加、减、乘、除的十进制基础能力；不承载业务公式。 |
| 普通数值运算 | `shared/lib/number` | UI 几何、动画等非金融 `number` 计算；不可用于业务数据。 |
| 时间 | `shared/lib/time` | 当前仅提供带默认时区的日期/时间展示；默认时区来自 `sharedConfig.time.defaultTimeZone`。 |
| 存储 | `shared/lib/storage` | 受类型约束的 Web Storage 唯一入口。 |
| 剪贴板 | `shared/lib/clipboard` | 基于 `copy-to-clipboard` 的文本复制；不包含 UI 提示。 |
| 通知 | `shared/notification` | 全局用户反馈入口；当前使用原生对话框，后续承接定制通知 Provider/UI。 |
| 下载 | `shared/lib/download` | Blob 或既有 URL 的浏览器下载。 |

新增基础函数前先检查已有能力是否覆盖。若属于既有能力，添加到该能力目录；若是第二个可独立演进的概念，创建新能力目录和 `index.ts`，并补充本文档、AI 协作指南与验证记录。领域计算（收益、仓位、指标等）留在 `entities` 或 `features`，不得放进 `shared/lib`；它们可以调用 `shared/lib/decimal`，但必须自行定义单位、精度、舍入与边界。`shared/lib/number` 仅服务 UI 几何和动画等非金融场景，不能作为规避十进制精度约束的入口。

## Hook 归属规则

项目禁止建立平铺的 `src/hooks/` 目录。Hook 必须归属于它服务的领域或技术能力，和对应的类型、工具、组件放在同一个模块内：

| Hook 类型 | 正确位置 | 示例 |
| --- | --- | --- |
| 应用装配/Provider 生命周期 | `src/app/<segment>/` | 应用级 Provider 内部 Hook |
| 某个用户动作的状态与交互 | `src/features/<feature>/model/` | `features/run-backtest/model/useRunBacktest.ts` |
| 某个稳定业务对象的查询/计算 | `src/entities/<entity>/model/` | `entities/strategy/model/useStrategySummary.ts` |
| 页面或 Widget 私有交互 | 所属 slice 的 `model/` 或 `ui/` | `widgets/market-panel/model/useMarketFilters.ts` |
| 跨业务的浏览器/基础设施能力 | `src/shared/lib/<capability>/` | `shared/lib/pwa/usePwaInstall.ts` |
| 全局技术域能力 | `src/shared/<segment>/` | `shared/theme/model/useAppTheme.ts`、`shared/i18n/useAppLanguage.ts` |

一个能力目录可包含多个紧密相关的 Hook，但必须以能力命名（如 `pwa`、`storage`、`browser`），不能命名为泛化的 `hooks`。每个 Hook 单独文件，通过该能力目录的 `index.ts` 导出。没有第二个明确消费者前，不要把业务 Hook 提升到 `shared`。

## 目录粒度规则

目录按**单一概念**划分，而不是按文件类型划分。禁止出现会无限增长的“收纳目录”，例如 `hooks/`、`utils/`、`components/`、`services/`、`types/`；一旦同一目录出现两个可独立命名、独立测试或独立演进的能力，立即为它们建立各自的子目录。

同一概念的配套文件可以共存，不代表目录设计有问题。例如：

```text
shared/ui/theme-switcher/
├── ThemeSwitcher.tsx         # 唯一组件实现
├── ThemeSwitcher.module.scss # 该组件唯一的样式
└── index.ts                  # 唯一公共入口
```

以下情况必须下钻，不要继续在当前目录平铺文件：

```text
# 错误：pwa 目录开始混入两个独立能力
shared/lib/pwa/
├── usePwaInstall.ts
├── usePwaUpdate.ts
└── usePwaOffline.ts

# 正确：每个能力拥有自己的边界
shared/lib/pwa/
├── install/
│   ├── usePwaInstall.ts
│   └── index.ts
├── update/
│   ├── usePwaUpdate.ts
│   └── index.ts
└── index.ts
```

例外仅限于同一概念不可拆分的配套文件：实现、样式、类型、测试、说明和公共入口。AI 发现某个目录开始容纳多个并列能力时，必须先重组目录，再添加新文件。

## 公共 UI 命名空间

`shared/ui` 是项目级公共组件库。后续新增组件使用 `tld-` 命名空间：目录名为 `tld-<component>`，React 导出为 `Tld<Component>`。例如：

```text
shared/ui/tld-button/
├── TldButton.tsx
├── TldButton.module.scss
└── index.ts
```

该规则只适用于 `shared/ui`，不扩展到业务 slice；`features/run-backtest`、`entities/strategy` 等仍以业务含义命名。现有初始组件不做无收益重命名。

## 新功能落位

以“新建并运行策略”为例：交互和状态放在 `features/create-strategy`，策略领域接口和类型放在 `entities/strategy`，策略页仅组合这两个模块。若某区块需在多页复用，则升为 `widgets`。不要因为“可能复用”提前放进 `shared`。
