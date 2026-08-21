# AI 协作者入口

在修改本仓库前，先阅读：

1. [开发规范](./docs/development-standards.md)
2. [TypeScript 规范](./docs/typescript-standards.md)
3. [测试规范](./docs/testing-standards.md)
4. [架构约定](./docs/architecture.md)
5. [AI 协作指南](./docs/ai-collaboration.md)

核心约束：遵守 Feature-Sliced Design（FSD）的 `app → pages → widgets → features → entities → shared` 分层依赖；业务 slice 仅经根目录 `index.ts` 暴露公共 API；`app` 与 `shared` 使用技术 segments，不按业务 slice 划分。LocalStorage 与 SessionStorage 只能通过 `shared/lib/storage` 访问，违规会阻断 lint 和 build。

本项目的 AI 代码协作工具统一使用 Codex。Codex 开始任何代码改动前，必须从 `ai/skills/` 选择并阅读对应 Skill：业务功能使用 `quant-lab-feature-delivery`，跨切面变更使用 `quant-lab-cross-cutting-change`，已有 diff 的独立只读检查使用 `quant-lab-change-review`。`ai/skills/` 是唯一团队 Skill 源码，不复制到其他工具或个人规则中；Skill 编排流程而不取代本文件、详细文档、lint、测试或 CI。完整协作边界见 [AI Skills 与 Agent 协作](./docs/ai-skills.md)。

包管理器唯一使用 pnpm `10.28.2`。所有项目命令必须使用 `pnpm` 或 `pnpm run`；禁止 npm、yarn、npx、bun。`scripts/enforce-pnpm.mjs` 会阻断错误执行器以及 `package-lock.json`、`yarn.lock` 等非 pnpm 锁文件。新增运行时依赖使用 `pnpm add`，构建/测试依赖使用 `pnpm add -D`，并在同一提交更新 `package.json`、`pnpm-lock.yaml`、文档与 CI；禁止手改 lockfile 或忽略其他锁文件。依赖安装脚本默认不执行；只有 `pnpm-workspace.yaml` 的 `onlyBuiltDependencies` 中已审查的精确包名才能运行。新增白名单必须记录用途和风险，并只用 `pnpm approve-builds <包名>` 审批，禁止全量批准。

TypeScript 使用 strict 模式：禁止 `any`、非空断言和无校验的外部数据断言；所有具名函数与类方法必须标注返回类型。对象契约使用 `interface`，联合/映射/泛型组合使用 `type`；请求 DTO、领域模型与 UI Props 必须分层定义。完整规则见 [TypeScript 规范](./docs/typescript-standards.md)。

测试按模块与可验证行为就近组织，不按页面数量创建。公式、解析、状态转换、公共能力和缺陷修复必须补同目录单元测试；纯页面组合或静态布局通常不测。当前仅支持 `.test.ts` 基础测试，组件交互与 E2E 出现真实需求后再独立立项，详见 [测试规范](./docs/testing-standards.md)。

业务资源就近归属到拥有它的模块 `assets/`，禁止建立全局 `src/assets` 收纳目录。资源有第二个真实消费者时，移动到共同允许依赖的最低层并经 `index.ts` 公开导入，删除原副本；同层业务 slice 禁止深层导入彼此资源。详见 [资源归属与提升规则](./docs/architecture.md#资源归属与提升规则)。

`src` 未引用资源通常不会进入 Vite 产物，但仍须在功能替换/删除时一并清理；资源必须经静态 import 或 SCSS `url()` 使用。`public/` 文件无论是否引用都会发布到 `dist`，只能放有明确固定 URL 用途的资源，详见 [资源构建与清理](./docs/architecture.md#资源构建与清理)。

`shared/config` 只放环境、默认值、开关和存储键；`shared/constants` 只放项目短名、缩写、公共静态资源路径等跨页面稳定标识。文本只维护在中英文语言包；策略状态、订单类型和金融标的名称等领域数据留在所属 `entities`、`features` 或 API 数据中。

路由采用语义化资源路径：ID 使用领域路径参数，如 `/strategies/:strategyId`，不得使用 `?id=` 或通用 `/detail/:id`。查询参数只用于筛选、排序、分页、Tab 等可选视图状态；当前内部系统处于 `noindex` 阶段，不能以 SEO 为理由虚构公开站点配置。

样式是强制约束：统一使用 SCSS；只有 `src/app/styles` 能写全局 token、重置和断点工具，页面、Widget、Feature、Entity 与 `shared/ui` 的样式必须就近使用 `*.module.scss`。设计稿的常规尺寸直接写 px；严禁 px-to-rem/px-to-vw 自动转换，以及通过修改根字号实现整体响应式缩放。当前阶段只实现桌面端（最低 1024px），以 1280px 作为紧凑桌面断点；使用流式容器、`minmax()`、`min-width: 0` 和可滚动的密集数据区域为后续移动端留出空间，但不得擅自设计或实现手机端结构。

全局样式只能从 `src/app/styles/index.scss` 进入；字体登记、token、mixin、reset、初始化和动效必须分文件维护。组件只可按需引用 `_mixins.scss`，不得引用全局入口或把业务视觉写入 `app/styles`。

高频工具类只使用 `_utilities.scss` 中以 `tld-` 开头的受控能力。允许布局、间距、字号、文本流、Safe Area 等中性工具；禁止颜色、主题、阴影、业务状态和组件外观工具类。`tld-gap-*` 是 CSS 间隙，`tld-spacer-*` 才是占位块；复杂视觉必须回到模块 `*.module.scss`。

`pnpm run lint` 会运行 Stylelint 并阻断重复实现已有 `tld-*` Utility 的确定等价声明。禁止添加 `stylelint-disable` 或将新样式加入 `stylelint.config.mjs` 的 `legacyStyleFiles`；确需新通用能力时，先扩展 Utility、文档与 lint 映射。

后续 CSS/SCSS class 名统一使用小写短横线（kebab-case），如 `tld-button`、`strategy-card-header`、`is-active`；禁止 camelCase、PascalCase、下划线和无分隔缩写。CSS Modules 用 `styles['class-name']` 访问；全局 Utility 和需被 VS Code 扫描的 class 使用字面量 className。既有初始代码不做无行为变化的迁移。

后续新增 `shared/ui` 公共组件必须使用 `tld-` 命名空间：目录为 `tld-<component>`，React 导出为 `Tld<Component>`，如 `shared/ui/tld-button/TldButton.tsx`。业务 slice 不使用该前缀；当前初始组件不做无行为变化的重命名。

范围限制：当前项目不做无障碍（a11y）适配与验收。不要自行添加无障碍库、全局无障碍样式、键盘交互、屏幕阅读器文案或相关测试；如未来需要，必须先更新规范并获得明确需求。

入口 Meta 只维护已确认的通用配置。`VITE_APP_NAME`、`VITE_APP_DESCRIPTION` 和 `VITE_ROBOTS` 同步维护 `index.html`、`.env.example` 和环境文档；项目未对外公开前，保持 robots 禁止收录，不得虚构域名、分享图、PWA 或缓存策略。

`.env.development` 是每位开发者本地文件，必须忽略且不得提交。首次拉取代码后从 `.env.development.example` 创建；模板更新时手工合并，不覆盖本地后端配置。`VITE_DEPLOY_ENV=development` 必须在本地开发文件中，Vite 会校验它与 mode 一致；完整步骤见 [环境配置](./docs/environment.md)。

Web 构建输出按部署环境隔离：`dist/staging`、`dist/production`。开发环境只运行 Vite 开发服务器，不允许生成部署包。Electron 主进程构建输出固定为 `dist/electron`，安装包输出固定为被忽略的 `release/`，不得混入 Web 部署产物。JS、CSS、图片和字体等构建资源必须保留 `[name]-[hash]` 文件名；部署端须让 `index.html` 使用短缓存/`no-cache`，让 `assets/*` 使用长期 `immutable` 缓存。`public/` 不带 hash，只可放固定 URL 的发布资源。详见 [环境配置](./docs/environment.md#构建目录与缓存)。

Vite mode 仅允许 `development`、`staging`、`production`；development 只可用于开发服务器，staging/production 才可构建，且 `VITE_DEPLOY_ENV` 必须与 mode 一致，配置会立即阻断不一致构建。`base`、浏览器 target、sourcemap、manifest、手动分包和 PWA 都需要明确部署或产品条件，禁止为了“完整”预配；完整清单见 [环境配置](./docs/environment.md#暂不预设的-vite-配置)。

PWA 当前未启用：只能从 `shared/lib/pwa` 使用预留的安装生命周期 Hook；`main.tsx` 已初始化安装事件监听，但禁止添加 manifest、Service Worker 注册、缓存逻辑、PWA 插件或安装入口。未来启用必须按 `docs/pwa.md` 作为独立任务确认安全边界与验收范围。

Hook 不允许集中堆入 `src/hooks`。按 FSD 归属到对应业务 slice 的 `model`/`ui`，或归入命名明确的 `shared/lib/<capability>`、`shared/<segment>`；每个能力目录通过 `index.ts` 暴露 Hook。详见 `docs/architecture.md` 的“Hook 归属规则”。

目录只承载一个可命名的概念；实现、样式、类型、测试、说明和入口可作为同一概念的配套文件共存。新增第二个独立能力前必须先创建子目录，禁止形成 `hooks`、`utils`、`components`、`services`、`types` 等无限收纳目录。详见 `docs/architecture.md` 的“目录粒度规则”。

`shared/lib` 也不得创建万能 `utils`：数值展示、十进制运算、普通数值运算、时间、存储、下载分别使用 `format`、`decimal`、`number`、`time`、`storage`、`download` 的目录根入口。金融和业务数值的加减乘除必须经 `shared/lib/decimal`，禁止业务模块直接导入 `decimal.js`；输入/输出优先用字符串。`shared/lib/number` 仅限 UI 几何和动画等非金融数值。收益、回撤、手续费、仓位等业务公式仍须按领域明确单位、精度、舍入与边界后留在 `entities` 或 `features`，并补测试。

私有 `.ts`/`.tsx` 禁止写原始 `+`、`-`、`*`、`/`、复合赋值、`++`、`--`；`pnpm run lint:arithmetic` 会以 AST 检查阻断。只有 `shared/lib/decimal` 和 `shared/lib/number` 可以实现这些运算，其他模块必须导入对应公共方法；文本拼接改用模板字符串，禁止增加豁免。

复制文本只通过 `shared/lib/clipboard` 的 `await copyText`，底层固定使用哇学社已上线验证的 `copy-to-clipboard`。禁止业务模块直接导入该库或自行调用原生 Clipboard API；调用方根据真实布尔结果显示本地化反馈。

用户通知只通过 `shared/notification` 的 `notification.success/info/warning/error/confirm`。当前内部临时使用原生对话框；禁止业务模块直接调用 `alert`、`confirm`、`prompt`，未来定制通知 UI 只替换模块内部实现。通知文案由调用方通过 i18n 提供。

日期与时间原生 API 只允许在 `shared/lib/time` 实现：业务和私有模块禁止使用 `Date`（含 `new Date`、`Date.now`、`Date.parse`）及 `Intl.DateTimeFormat`，Oxlint 会阻断。需新增时间能力时，先扩展 `shared/lib/time` 并经其 `index.ts` 导出，禁止添加 lint 忽略；普通定时器用于请求超时或资源回收不属于本规则。

主题是强制约束：组件 SCSS 禁止写任何颜色值，必须使用语义 `--color-*` token。所有主题固定不变的颜色只登记在 `src/app/styles/_colors.scss`，并使用 `--color-static-*`；随主题变化的语义色只登记在 `_tokens.scss`。主题名统一在 `shared/config/theme.ts` 注册，主题应用与持久化只经 `shared/theme`，存储键只经 `sharedConfig.storageKeys.theme`。新增主题必须完整定义 token、补充中英文名称并验证已有页面；禁止在业务组件中判断 `dark` / `light` 或散落主题颜色。主题切换动画统一调用 `useThemeTransition`，禁止组件直接操作 `document.startViewTransition` 或根节点主题属性。

Stylelint 会阻止模块 SCSS 中的 hex、命名颜色、`rgb()`、`hsl()` 等所有原始颜色（阴影、渐变、filter 也包含在内）。原始颜色只可定义在 `_colors.scss`（全主题固定）或 `_tokens.scss`（主题语义色）；模块只能消费 `var(--color-*)`，禁止用私有 CSS 变量绕过主题 token。

凡是新增或改变公共能力、入口、环境变量、路由、存储键、语言 key、依赖、构建/CI 或全局样式规则，必须同步更新文档；写清职责、入口、扩展步骤、验证方式和未决项。改动后运行 `pnpm run build && pnpm run lint`。不要修改无关代码、猜测量化业务规则或擅自执行远端 Git 操作。
