# Quant Lab Web 开发规范

本规范适用于本项目的所有人工与 AI 协作者。目标是：在多人协作、频繁使用 AI 开发的前提下，让每次改动边界清晰、可验证、可持续合并。

> 规则优先级：用户当前需求 > 本文档 > 现有模块约定 > 个人习惯。若规则冲突或需求会改变架构，先说明影响并取得确认。

## 1. 协作原则

1. **一次改动只解决一个明确目标。** 不顺带重构无关模块，不修改自己未理解的业务规则。
2. **接口优先，内部可替换。** 模块通过目录根部的 `index.ts` 暴露能力；外部代码不得导入模块内部实现文件。
3. **先复用、再抽象。** 已有公共能力优先复用；只有确认会被多处使用时，才提升到 `shared` 或 `widgets`。
4. **默认保守。** 不新增依赖、不更改构建配置、不迁移全局状态；如确有必要，需说明收益、替代方案和影响范围。
5. **代码与文档同步。** 架构边界、环境变量、接口契约或开发流程改变时，同步更新对应文档。
6. **AI 可接手。** 新增或改变公共能力时，按 [AI 协作指南](./ai-collaboration.md) 写明职责、入口、扩展步骤、验证方式与未决项，禁止让关键信息只存在于聊天记录中。
7. **依赖一致。** 包管理器唯一使用 pnpm `10.28.2`。所有项目命令只能使用 `pnpm` 或 `pnpm run`；禁止 npm、yarn、npx、bun。执行守卫会阻断错误执行器和非 pnpm 锁文件，不能绕过或关闭。

## 2. 目录与依赖规则

项目采用 Feature-Sliced Design（FSD），按单向依赖组织：

```text
app → pages → widgets → features → entities → shared
```

低层目录禁止依赖高层目录；除 `app` 和 `shared` 外，同层不同业务模块之间也禁止直接互相引用。跨模块复用应下沉到更低层，或将共享能力抽取为新模块。

| 目录 | 职责 | 可以包含 |
| --- | --- | --- |
| `src/app` | 应用装配 | 路由、Provider、全局样式 |
| `src/pages` | 路由入口 | 页面布局与模块组合 |
| `src/widgets` | 跨页面展示区块 | 顶栏、侧栏、行情面板、策略列表 |
| `src/features` | 用户可感知的业务动作 | 创建策略、回测、调仓、导出 |
| `src/entities` | 稳定业务对象 | 策略、标的、组合的类型、API、展示 |
| `src/shared` | 项目基础设施 | HTTP、环境配置、格式化、基础 UI、常量 |

新增模块使用小写短横线命名，例如 `features/run-backtest/`、`entities/portfolio/`。模块对外只通过 `index.ts` 导出；内部文件可以自由调整，不应被外部直接引用。

业务资源跟随其所属模块的 `assets/`，禁止集中新建 `src/assets`。第二个真实消费者出现时，移动到共同允许依赖的最低层（同一实体归 entity，真正通用的视觉资源归 `shared/assets/<category>`），由 `index.ts` 导出并删除旧副本；跨模块不得深层导入其他 slice 的资源。完整判断与迁移步骤见 [架构约定](./architecture.md#资源归属与提升规则)。

`src` 中未引用资源通常不会进入 Vite 产物，但仍必须在替换/删除功能的同一任务清理，不能当作“以后可能使用”的仓库缓存。`public/` 中所有文件都会原样进入部署产物，只能存放有明确固定 URL 用途的发布资源；完整构建与清理规则见 [资源构建与清理](./architecture.md#资源构建与清理)。

## 3. 业务功能落位

实现新需求前，先按下列问题判断位置：

1. 它是否是一个用户动作？是则放入 `features`。
2. 它是否描述一个稳定的业务对象？是则放入 `entities`。
3. 它是否由多个页面复用且包含完整展示/交互？是则放入 `widgets`。
4. 它是否不包含量化领域含义？是则放入 `shared`。
5. 页面只负责路由与组合；不要在页面内堆积请求、复杂状态或通用组件。

示例：`创建策略` 的表单和提交逻辑放在 `features/create-strategy`；`StrategySummary` 与策略 API 放在 `entities/strategy`；策略页负责把它们组合起来。

## 4. TypeScript 与 React

- 必须遵守独立的 [TypeScript 规范](./typescript-standards.md)。项目已启用 strict 编译模式；`any`、非空断言、缺少显式返回类型的具名函数/类方法均为 lint error，不能压制或绕过。
- 外部未知数据使用 `unknown` 后再校验；每个业务接口的 DTO、领域模型、请求参数与错误契约必须在所属 slice 明确类型，不能只用 `apiClient` 泛型断言代替运行时校验。
- 领域类型定义在所属 `entities` 或 `features`，不要建立全局的“万能 types”文件。
- 对象契约（Props、DTO、options、Hook 返回对象）使用明确的 `interface`；联合、映射与泛型组合使用 `type`。仅在模块根 `index.ts` 暴露公共组件/类型。
- 所有具名函数、类方法、组件和公共 Hook 都要标注准确返回类型；无返回值写 `void`，异步结果写 `Promise<T>`。React 组件返回 `ReactElement`，公共 Hook 返回命名的 Controller/State interface。
- 禁止新建 TypeScript `enum`；有限状态使用 `as const` 常量和联合类型。DTO 与领域模型不得混用，金融字段必须注明单位、精度、舍入和时区。
- 业务名称、状态值和路由路径使用常量或联合类型，不散落魔法字符串。
- 路由使用语义化资源路径：资源 ID 必须放在领域路径参数中，如 `/strategies/:strategyId`，不能使用 `?id=` 或通用 `/detail/:id`。查询参数仅用于筛选、排序、分页、Tab 等可选视图状态；当前无真实需求时不得预建查询状态模块。
- 组件保持单一职责。出现多个独立状态区、多个请求或多个业务动作时，应拆分组件或抽为 feature。
- 默认使用本地状态；引入全局状态库前，先证明跨页面共享、缓存或复杂协调确有必要，并记录决策。
- React key 必须稳定，不使用数组下标作为可变列表 key。
- 禁止新建平铺的 `src/hooks`。Hook 按 FSD 归属：业务 Hook 放在所属 `features`/`entities`/`widgets`/`pages` 的 `model` 或 `ui`，跨业务技术能力放在命名明确的 `shared/lib/<capability>` 或 `shared/<segment>`。完整判定表见 [架构约定](./architecture.md#hook-归属规则)。
- 目录只承载一个可命名的概念。实现、样式、类型、测试、说明和 `index.ts` 可作为同一概念的配套文件共存；出现两个可独立演进的能力时必须立即创建子目录，禁止继续堆入 `hooks`、`utils`、`components`、`services`、`types` 等收纳目录。完整示例见 [目录粒度规则](./architecture.md#目录粒度规则)。
- 测试按模块能力和可验证行为就近放置，不按页面数量机械创建。领域公式、DTO 解析、状态转换、公共能力和缺陷修复必须有同目录测试；纯路由组合与静态布局通常无需测试。测试文件命名、当前运行能力和未来组件/E2E 接入条件见 [测试规范](./testing-standards.md)。

## 5. API、数据与状态

- 环境配置、可配置默认值、功能开关、存储键放在 `shared/config`；项目短名、缩写和公共静态资源路径等跨页面稳定标识放在 `shared/constants`。用户可见文字只维护在 `shared/i18n/locales`；业务专属枚举与状态值、金融标的名称仍应放在所属 `entities` 或 API 数据中，不得塞入公共模块。
- 本应用的 LocalStorage 仅通过 `shared/lib/storage` 读写，键名先登记到 `sharedConfig.storageKeys`，并同步扩展该模块的 `StorageSchema`；禁止使用 `localStorage.clear()`。
- Oxlint 会禁止除 `shared/lib/storage` 外的 `localStorage`、`sessionStorage` 以及 `window.localStorage`、`window.sessionStorage`。该规则为 error 级别，并已纳入所有 build 命令；不得在业务代码中关闭或绕过它。
- 所有 HTTP 请求基于 `src/shared/api/client.ts` 导出的 `apiClient` 封装；业务模块不得直接散落 `fetch`。当前客户端不假设响应包裹格式，领域模块负责定义并校验其 API 契约。
- API 类型应靠近领域：例如 `entities/strategy/api`、`entities/strategy/model`。
- 页面展示必须考虑四种状态：加载中、空数据、请求失败、正常数据。涉及交易动作时还应考虑无权限和提交中。
- 不在前端写入真实密钥、账户、令牌或生产数据。公开给浏览器的环境变量使用 `VITE_` 前缀，并提供 `.env.example` 与 `.env.development.example` 的脱敏示例；真实 `.env.development` 必须忽略且不得提交。
- 仅可公开给浏览器的数据使用 `VITE_` 前缀；密钥、令牌和内网敏感配置不得进入任何前端环境文件。环境文件与本地代理规则见 [环境配置](./environment.md)。
- 金额、收益率、日期等展示统一使用 `shared/lib` 中的格式化函数；不要各页自行格式化。展示格式须传入当前语言环境。
- `shared/lib` 不是万能 `utils`：数值展示只使用 `shared/lib/format`，日期/时间展示只使用 `shared/lib/time`，文件下载只使用 `shared/lib/download`。外部代码只能从各能力的 `index.ts` 导入。
- 基础十进制运算只从 `shared/lib/decimal` 导入 `decimalAdd`、`decimalSubtract`、`decimalMultiply`、`decimalDivide`。输入与结果优先用字符串；禁止业务模块直接导入 `decimal.js`，Oxlint 会阻断。该模块固定为 40 位有效数字和 `ROUND_HALF_UP`，除以零会抛错。
- 任何私有 TypeScript/TSX 文件禁止出现原始 `+`、`-`、`*`、`/`、复合赋值及 `++`/`--`。`pnpm run lint` 的 AST 检查会阻断；加减乘除只能从 `shared/lib/decimal`（金融/业务数据）或 `shared/lib/number`（仅 UI 几何、动画等非金融数据）导入。文本拼接使用模板字符串，不使用 `+`。两个模块自身是唯一实现豁免，禁止扩大豁免范围或跳过脚本。
- `shared/lib/decimal` 解决 JavaScript 二进制浮点误差，不定义业务口径。收益、回撤、手续费、仓位等公式仍放在所属 `entities` 或 `features`，必须声明单位、精度、舍入、边界并补单元测试。
- 文本复制只从 `shared/lib/clipboard` 导入 `copyText`。禁止直接调用原生 Clipboard API 或直接导入 `copy-to-clipboard`；当前封装固定使用哇学社线上验证过的三方库。`copyText` 返回 `Promise<boolean>`，调用方必须 `await` 真实结果后再按业务场景显示本地化成功/失败反馈。
- 用户通知只从 `shared/notification` 导入 `notification`。禁止业务模块直接调用 `alert`、`confirm`、`prompt`，Oxlint 会阻断。当前五类方法暂时回退到原生对话框；后续定制样式、队列、位置和关闭交互必须在本模块与其 Provider/UI 内实现，不能改变业务调用入口。通知文本由调用方使用 i18n 生成，不在通知模块硬编码文案。
- 默认展示时区只在 `sharedConfig.time.defaultTimeZone` 配置，当前为 `Asia/Shanghai`；不得在页面或组件中散落默认时区。当前时间模块只提供 `formatDateTime`：必须传当前语言环境，并可通过 `options.timeZone` 覆盖默认值。市场、账户等有独立时区的领域视图必须显式传 IANA 时区。
- 服务端时间字符串若表达一个确定时刻，必须带时区。日期比较、倒计时和交易日等能力尚未立项；有明确需求后再按独立能力补充，不要自行实现临时工具函数。
- Oxlint 会禁止 `shared/lib/time` 以外的 `Date`（包括 `new Date`、`Date.now`、`Date.parse`）与 `Intl.DateTimeFormat`。需要新的日期/时间能力时，先在 `shared/lib/time` 封装、从其 `index.ts` 导出、补充本规范与 AI 协作指南，再由业务模块调用；不得用 lint 忽略或在私有文件实现。
- 禁止复用基于 JavaScript `number` 的“精确四则运算”作为金额、价格、数量或收益计算方案。通用四则运算使用 `shared/lib/decimal`；量化计算的精度、舍入、最小单位和领域公式仍必须在 `entities`/`features` 中明确设计和测试。
- 下载内容由调用方确定文件名、MIME 类型与权限；`downloadFile` 只负责浏览器触发。
- 多语言资源放在 `shared/i18n/locales`；不得在组件中硬编码面向用户的文案。当前仅维护 `zh-CN` 与 `en-US` 两种语言；新增语言需先获得明确确认，并同时补全所有 key、在 `supportedLanguages` 注册。
- 量化项目跨页面高频显示词优先复用 `terms.*`（如 `terms.strategy`、`terms.backtest`、`terms.maxDrawdown`），不要在页面重复造同义 key。`terms` 只放短词或短语；完整业务句子仍归属对应页面/功能的语言分组。

## 6. UI 与样式

> 当前项目明确**不做无障碍（a11y）适配**：不以 WCAG、键盘操作、屏幕阅读器、焦点管理或辅助技术测试作为开发与验收目标。AI 不得为“完善性”自行引入无障碍库、全局无障碍样式或额外适配工作；保留原生 HTML 语义不构成额外承诺。

### 6.1 强制样式架构

以下规则对人工和 AI 协作者均为**强制要求**：

1. 项目样式统一使用 SCSS；新增样式文件必须是 `.scss`，不得新增 `.css`、CSS-in-JS 或页面内 `style` 对象（动态计算的单个值除外）。
2. `src/app/styles` 是唯一允许写全局样式的目录，且只能放全局入口、设计 token、字体登记、mixin、重置、初始化、浏览器全局动效和受控 Utility 规则。禁止在此写任一业务页面、Widget 或组件的视觉样式。
3. `pages`、`widgets`、`features`、`entities` 和 `shared/ui` 中的组件样式必须与组件同目录，命名为 `组件名.module.scss`，并通过 CSS Modules 引入。禁止新增无作用域的业务 class，也禁止跨模块覆盖别人的 class。
4. 颜色、字号、圆角、阴影、页面边距和断点等可复用视觉决策，先定义或复用全局 CSS 变量；Sass 变量和 mixin 只用于编译期组织，不替代运行时 token。全主题固定不变的颜色登记在 `src/app/styles/_colors.scss`，随主题变化的语义色登记在 `_tokens.scss`。
5. 组件 SCSS 中禁止出现颜色值（如 `#`、`rgb()`、`hsl()`）；必须消费语义化 `--color-*` token。原始颜色仅能定义在 `_colors.scss`（固定色）或 `_tokens.scss`（主题色），不得使用 `dark` / `light` 作为业务组件的 class 判断。
6. `_colors.scss` 只允许定义每个主题均完全相同的 `--color-static-*` 值，例如透明、纯白、纯黑；不得放品牌色、状态色、文字色、页面色或任何可能随主题变化的值。需要在主题间改变的颜色必须进入 `_tokens.scss`，并使用语义化名称。
7. 主题由 `shared/config/theme.ts` 注册主题名、`shared/theme` 负责应用和持久化、`_tokens.scss` 提供各主题的完整语义 token 契约。新增主题时必须同时完成这三处、补齐两种语言名称，并验证现有页面，不得只复制局部颜色。
8. 主题切换动画只能通过 `shared/theme` 导出的 `useThemeTransition` 实现。该 Hook 会遵守系统“减少动态效果”偏好并兼容不支持 View Transitions API 的浏览器；组件不得自行调用 `document.startViewTransition` 或直接修改根节点主题属性。

CSS/SCSS 的后续 class 名统一使用**小写短横线（kebab-case）**：`strategy-card`、`strategy-card-header`、`is-active`、`tld-button`。禁止新增 camelCase、PascalCase、下划线或无分隔的缩写 class。CSS Modules 的短横线 class 通过 `styles['strategy-card']` 引用；全局 Utility 和需要由 VS Code class 扫描插件识别的 class 使用字面量 `className="tld-flex"`。现有初始 class 不为命名规则做无行为变化的重命名。

全局样式目录固定如下，新增文件必须先说明其属于哪一类：

```text
src/app/styles/
├── index.scss          # 唯一全局入口，只能在 main.tsx 导入一次
├── _colors.scss        # 所有主题固定不变的 --color-static-* 原始色值
├── _tokens.scss        # 主题语义 token 与主题色值
├── _fonts.scss         # 字体栈与 @font-face 的唯一登记位置
├── _mixins.scss        # 可复用 Sass mixin 与断点常量
├── _reset.scss         # 浏览器默认样式归一
├── _init.scss          # html/body/#root 的基础初始化
├── _motion.scss        # View Transition 等全局动效兜底
└── _utilities.scss     # 统一 tld- 前缀的受控高频工具类
```

组件内只引入实际需要的 `_mixins.scss`；不得在组件内引入全局入口、reset、init、fonts 或其他页面样式。

### 6.3 Utility 工具类

- 所有全局工具类必须以 `tld-` 开头，定义仅能放入 `_utilities.scss`。禁止使用无前缀的 `.flex`、`.mt10`、`.size20` 等类名。
- 当前允许的类别：Flex/Grid 布局、流式尺寸、溢出与文本流、无业务含义的交互、Safe Area、以及 2px/5px 间距尺度。禁止添加颜色、主题、阴影、业务状态、组件外观或响应式显示工具类。
- `tld-fs-{n}`：2–200px 间能被 2 或 5 整除的字号；`tld-m*` / `tld-p*`：0–200px 同尺度的内外边距；`tld-gap-{n}`：真实 CSS `gap`；`tld-spacer-{n}`：全宽的垂直占位块。`gap` 不能被当作占位块使用。
- 工具类只用于降低无业务结构的重复代码。一个元素需要多个工具类才能表达完整组件布局，或涉及颜色、边框、图表、卡片、业务状态时，改写为该模块的 `*.module.scss`。
- 当前只做桌面端；Safe Area 工具类仅为未来移动端保留，不得据此擅自补充手机布局。
- Stylelint 会在后续模块样式中阻止与 Utility 完全等价的声明：Flex/Grid 展示与常用对齐、2px/5px 尺度的字号、margin、padding、gap。错误会提示改用 `tld-*`。复杂 Grid 模板、定位、图表和业务视觉不在此禁用范围，仍应使用模块 SCSS。
- Stylelint 同时禁止除 `_colors.scss` 与 `_tokens.scss` 外的 SCSS 中出现十六进制、命名颜色以及 `rgb()`、`hsl()` 等原始颜色函数（包括阴影、渐变和 filter 内的颜色）。固定色只维护在 `_colors.scss`，主题语义色只维护在 `_tokens.scss`；模块中使用 `var(--color-*)`。不得通过私有 CSS 变量重新定义颜色。
- 初始骨架样式列在 `stylelint.config.mjs` 的 `legacyStyleFiles` 中，仅作为过渡豁免；新增模块不得加入该列表，也不得通过 `stylelint-disable` 绕过规则。需要扩展 Utility 能力时，先补 `_utilities.scss`、文档和 lint 映射，再使用。

### 6.4 公共组件命名空间

- 后续新增的 `shared/ui` 公共组件必须使用 `tld-` 命名空间：目录使用短横线命名，如 `shared/ui/tld-button/`、`shared/ui/tld-data-table/`；React 组件、Props 和导出使用对应 PascalCase，如 `TldButton`、`TldButtonProps`。
- 一个公共组件目录只承载该组件及其配套文件：`TldButton.tsx`、`TldButton.module.scss`、`index.ts`，以及必要的类型、测试和说明。不要建立 `shared/ui/components/` 等二次收纳目录。
- `tld-` 仅用于公共 UI 命名空间和全局 Utility 工具类；业务实体、功能和页面不得为了统一前缀而使用 `tld-`。
- 本规则只约束后续新增组件；当前初始组件不因命名空间规则做无行为变化的重命名。确需迁移时，作为独立重构任务处理。

### 6.2 尺寸与响应式策略

1. 设计稿标注的常规尺寸直接使用 `px`：1920 设计稿中的 `100px` 在代码中就写 `100px`。**禁止**引入 px-to-rem / px-to-viewport PostCSS 插件，**禁止**用媒体查询修改 `html` 或 `:root` 的 `font-size` 来做整体缩放。
2. 仅标题字号、首屏高度、页面级间距等需要连续变化的少数视觉尺寸使用 `clamp(最小值, vw 值, 最大值)`。不要把所有尺寸机械替换为 `vw` 或 `clamp()`。
3. **当前阶段只验收桌面端**，覆盖常见桌面视口（最低 1024px、1280px、1440px、1920px）。`1280px` 是紧凑桌面断点，可用于收缩侧栏、调整栅格和间距。不得在当前阶段擅自定义手机导航、卡片层级、隐藏规则或手机专用视觉稿。
4. 桌面布局仍必须为后续适配留出空间：容器使用 `min()` / `max()` / `clamp()` 和合理的最大宽度；栅格使用 `minmax()`；弹性子项设置 `min-width: 0`；表格、图表等密集内容保留最小可读宽度并由外层允许横向滚动。不要用固定画布宽度或绝对定位堆砌整个页面。
5. 后续开始移动端设计时，先补充设计与验收范围，再新增 `767px` 等移动断点和移动专用结构。届时优先重排信息层级或使用专用组件，而非等比缩小桌面界面；该工作应作为单独任务记录。

新增或修改样式前，AI 必须先确认它属于全局 token、模块样式或响应式例外中的哪一种；无法归类时先询问，不得把样式随意放入 `app/styles`。

- 优先复用 `shared/ui` 基础组件及现有设计 token；跨页区块放入 `widgets`。
- 样式不得依赖页面 DOM 层级偶然成立。使用语义明确、局部可理解的 class 名称。
- 新页面至少保证当前定义的桌面端视口可用；无障碍适配不属于本项目当前范围。
- 图表先明确数据契约、空态和错误态，再接入图表库。不要为一个页面临时引入重量级依赖。
- PWA 当前未启用。仅可复用 `shared/lib/pwa` 的 Hook；`main.tsx` 中的安装事件监听用于保留浏览器事件，禁止自行添加 manifest、Service Worker、缓存策略、PWA 插件或安装入口；完整边界见 [PWA 预留能力](./pwa.md)。

## 7. Git 与多人协作

- 一个任务一个分支，分支名使用：`feat/`、`fix/`、`refactor/`、`docs/` 加短横线描述，例如 `feat/strategy-backtest`。
- 提交保持小而完整，格式：`type(scope): 简短说明`，例如 `feat(strategy): add backtest form`。
- 不提交 `dist`、本地环境文件、密钥、调试输出或无关格式化改动。
- 合并前说明：改了什么、为什么、如何验证、是否有后续事项。涉及共享契约时明确提醒其他成员。
- GitHub CI 会在推送和 PR 上执行 `pnpm install --frozen-lockfile`、lint、生产构建和预发布构建。所有合并目标分支都应启用该 CI workflow 的必需状态检查，未通过不得合并。
- 新增依赖前先确认没有现有能力或浏览器标准 API 可复用；运行时依赖使用 `pnpm add <package>`，开发依赖使用 `pnpm add -D <package>`。同一提交必须包含 `package.json`、`pnpm-lock.yaml`、用途说明和验证结果；禁止手改 lockfile、提交或忽略 `package-lock.json`、`yarn.lock`、`bun.lock*`。
- 依赖安装脚本默认拒绝执行。`pnpm-workspace.yaml` 的 `onlyBuiltDependencies` 是唯一白名单；当前仅允许 `esbuild`（Vite 构建）和 `@parcel/watcher`（开发文件监听）。如新增依赖要求安装期脚本，先审查脚本、记录包名/用途/风险，再执行 `pnpm approve-builds <明确包名>` 并提交该配置改动；禁止 `pnpm approve-builds` 的全量批准或手工放宽白名单。
- AI 只能在用户明确要求时执行提交、推送、创建 PR 或修改远端设置。

## 8. AI 协作者执行协议

AI 在改代码前必须：

1. 阅读本文件、[架构约定](./architecture.md) 及与任务相关的现有模块。
2. 先确认当前工作区是否存在未提交改动；保留并避开无关改动。
3. 用一句话说明将改动的模块边界与验证方法，再开始修改。
4. 不猜测接口、权限、资金计算、交易规则等关键业务含义；无法从代码或需求确定时，提出最小必要问题。

AI 实现时必须：

1. 只修改任务所需文件，保持依赖方向正确。
2. 沿用现有命名、代码风格和公共 API 模式。
3. 不为“看起来更完整”而填充虚假生产数据或实现未要求的交易行为。
4. 将不确定性、假设和待接入的后端契约标注清楚。
5. 遵守第 6 节的强制样式架构：模块使用 `*.module.scss`；仅 `app/styles` 可写全局样式；设计稿 px 直接使用，不得引入 rem 根字号缩放或 px 自动转换方案。当前仅实现和验收桌面端，不得擅自补充手机视觉逻辑。

AI 完成时必须：

1. 运行 `pnpm run build` 与 `pnpm run lint`；如果无法运行，明确说明原因。
2. 报告变更文件、验证结果，以及需要人工决策的事项。
3. 不声称已完成未执行的测试、部署或远端操作。

## 9. 完成定义（Definition of Done）

一个开发任务完成前，应满足：

- [ ] 功能符合需求，且放在正确模块层级。
- [ ] 无跨层反向依赖、无内部路径的跨模块导入。
- [ ] 加载、空、错误状态已覆盖或有明确的暂缓说明。
- [ ] TypeScript 构建与 lint 通过：`pnpm run build && pnpm run lint`。
- [ ] 文档、类型、环境变量或 API 契约已同步更新。
- [ ] 变更说明足以让另一位成员或 AI 无需口头补充即可接手。

## 10. 交给 AI 的任务模板

复制下方模板可得到更稳定的结果：

```text
目标：<一句话描述用户价值>
范围：<允许修改的页面/模块>
不做：<明确排除的功能>
数据/API：<已有接口、Mock 或待确认项>
验收：<可见行为、边界情况、需要运行的命令>
```

若没有完整模板，AI 应按最小可行范围实现，并在最终说明中列出已作出的假设。
