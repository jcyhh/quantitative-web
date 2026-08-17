# AI 协作指南

本项目会长期由多名人工协作者和多种 AI 工具共同维护。本文件的目标是让任一 AI 在**没有聊天记录、没有口头交接**的情况下，仍能定位正确模块、遵守约束、完成最小范围改动并自证结果。

## 1. 必读顺序

AI 开始任何代码任务前，按以下顺序阅读：

1. [`AGENTS.md`](../AGENTS.md)：不可违反的短规则。
2. [开发规范](./development-standards.md)：工程、样式、协作与验证要求。
3. [TypeScript 规范](./typescript-standards.md)：类型边界、API 数据校验与量化字段约定。
4. [测试规范](./testing-standards.md)：测试归属、覆盖边界与当前测试能力。
5. [架构约定](./architecture.md)：FSD 层级与依赖方向。
6. 与任务有关的模块 `README.md`、类型、公共入口 `index.ts` 和现有测试。
7. 涉及环境、仓库治理或未决事项时，再阅读[环境配置](./environment.md)和[待办](./todo.md)。

如果任务与现有文档冲突，以用户当前需求为准；AI 必须在最终说明中指出冲突和实际采用的处理方式。

## 2. 文档的最低信息标准

每个会被其他模块、人工或 AI 复用的能力，都必须有可发现的说明。说明可放在模块 `README.md`、类型注释或专门文档中，但必须回答以下问题：

| 必填信息 | 应说明的内容 |
| --- | --- |
| 职责 | 它解决什么问题，明确不解决什么问题。 |
| 公共入口 | 外部应从哪个 `index.ts` 或配置文件导入。 |
| 使用方式 | 最小调用示例、输入/输出或配置方式。 |
| 约束 | 禁止直接使用的 API、依赖方向、数据安全或样式限制。 |
| 扩展步骤 | 新增一项能力、配置项、存储键或语言文案时要同步改哪里。 |
| 验证方式 | 至少写出需要执行的命令，必要时补充手工验收点。 |
| 未决项 | 暂未确定的接口、业务规则或需要人工决策的边界。 |

“显而易见”“以后再看”不能替代上述说明。文档应使用短句、确定的路径和可复制的命令，避免依赖聊天上下文、隐含简称或模糊指代。

## 3. 何时必须更新文档

出现以下任一变化时，代码改动与文档更新必须同一任务完成：

- 新增或改变公共模块、公共 API、FSD 层级或模块导出入口。
- 新增环境变量、路由、请求约定、存储键、语言 key 或全局配置。
- 新增依赖、构建命令、lint 规则、CI 校验或开发前置条件。
- 改变响应式策略、设计 token、主题或组件样式约束。
- 发现尚未确定且会影响后续实现的产品/技术决策。

纯内部重构且公共行为、入口和约束均不变时，可不新增文档；但 AI 的最终说明仍要明确“无需更新文档”的理由。

## 4. AI 的实施流程

1. **定位**：确认需求属于哪一 FSD 层，找出现有公共能力，列出允许修改的文件范围。
2. **决策**：信息不足时只提出会改变实现方向的最小问题；不能用假数据或假定量化规则掩盖不确定性。
3. **实现**：遵守公共入口和依赖方向，不顺带重构无关区域。
4. **记录**：按第 3 节检查应更新的文档；新模块应补充最小 README 或公共 API 注释。
5. **验证**：默认执行 `npm run build && npm run lint`。若未执行或失败，必须如实说明原因与影响。
6. **交接**：最终输出必须包含：改了什么、关键路径、验证结果、假设/未决项。不要宣称已完成未执行的部署、提交、推送或接口联调。

## 5. 本项目已登记的基础设施

| 能力 | 唯一入口 | 扩展时必须同步 |
| --- | --- | --- |
| 路由 | `src/app/config/routes.ts`、`src/app/router/router.tsx` | 路由配置、页面 slice、多语言文案；资源 ID 用语义化路径参数（如 `/strategies/:strategyId`），查询参数只放筛选/排序/分页等可选视图状态；生产部署需保持 History 回退。 |
| HTTP 请求 | `src/shared/api` | 领域模块的 API 类型/校验；不得在业务模块直接调用 `fetch`。 |
| 项目常量 | `src/shared/constants` | 项目短名、缩写和公共静态资源路径；显示文字在语言包，领域数据留在实体/API。 |
| 数值展示 | `src/shared/lib/format` | 仅处理 `Intl` 展示；金额、价格、收益等计算留在领域模块，不能以 `number` 精度补丁替代计算方案。 |
| 十进制运算 | `src/shared/lib/decimal` | 仅提供加减乘除；字符串输入/输出优先，固定 40 位有效数字和 `ROUND_HALF_UP`，除零抛错。禁止业务模块直引 `decimal.js`。 |
| 普通数值运算 | `src/shared/lib/number` | 仅 UI 几何、动画等非金融计算；禁止用于金额、价格、数量、收益及任何业务数据。 |
| 时间 | `src/shared/lib/time`、`sharedConfig.time.defaultTimeZone` | 当前仅提供 `formatDateTime`。日期展示必须传当前 locale；默认时区为 `Asia/Shanghai`，可在 `options.timeZone` 覆盖；确定时刻的 API 字符串必须包含时区。日期比较、倒计时和交易日等能力需有明确需求后再新增。 |
| 剪贴板 | `src/shared/lib/clipboard` | 仅使用 `await copyText`；内部固定 `copy-to-clipboard`，返回 `Promise<boolean>`，调用方负责多语言反馈。 |
| 通知 | `src/shared/notification` | 仅使用 `notification.success/info/warning/error/confirm`；当前是原生对话框临时回退，后续定制 UI 只替换模块内部。 |
| 文件下载 | `src/shared/lib/download` | 调用方负责内容、MIME、文件名和权限，工具只触发浏览器下载。 |
| 多语言 | `src/shared/i18n` | `zh-CN` 与 `en-US` 的同名 key，禁止只补一种语言。 |
| 环境配置 | `.env.example`、`.env.development.example`、`src/shared/config` | 类型声明、环境文档；开发者从模板创建被忽略的 `.env.development`；浏览器可见变量才用 `VITE_` 前缀。 |
| Vite 构建 | `vite.config.ts`、`docs/environment.md` | 仅允许 development/staging/production；`VITE_DEPLOY_ENV` 必须与 mode 一致。不要擅自配置 base、target、sourcemap、manifest、手动分包或 PWA。 |
| 入口 Meta | `index.html`、`.env.example`、`docs/environment.md` | 产品名、描述、robots 等公开值须三处同步；不得添加虚假的域名、分享图、PWA 或缓存配置。 |
| LocalStorage | `src/shared/config/app.ts`、`src/shared/lib/storage` | `storageKeys`、`StorageSchema` 与 storage 封装；业务代码禁止直连 Web Storage API。 |
| 主题 | `src/shared/config/theme.ts`、`src/shared/theme`、`src/app/styles/_tokens.scss` | 注册主题名、补齐完整语义 token、补齐中英文名称；切换必须使用 `useThemeTransition`，组件中禁止硬编码颜色、以主题名分支或直接调用 View Transitions API。 |
| PWA 预留 | `src/shared/lib/pwa`、`docs/pwa.md` | 当前只提供安装生命周期 Hook；不得注册 Service Worker、添加 manifest、缓存策略或入口，直到单独立项确认。 |
| 样式与响应式 | `src/app/styles`、各模块 `*.module.scss` | 当前只验收最低 1024px 的桌面布局；使用 token、流式容器和模块样式为后续移动端留扩展点，禁止新增全局业务样式或猜测手机视觉。 |

## 6. AI 友好的写法

- 使用绝对、稳定的术语：例如“在 `sharedConfig.storageKeys` 登记键名”，不要只写“加到配置里”。
- 公共配置和枚举使用命名常量；不要把影响业务含义的字符串散落在组件中。
- 区分 `shared/config` 与 `shared/constants`：环境/默认值/开关进 config，项目短名、缩写、公共静态资源路径等稳定标识进 constants。用户可见文字、策略状态和金融标的名称不得进入 constants。
- 将领域类型、API 契约、状态和展示组件放在同一业务 slice 附近，减少 AI 跨目录猜测。
- TypeScript 使用 strict 模式。所有具名函数和类方法必须有显式返回类型；对象契约用 `interface`，联合/映射/泛型组合用 `type`。外部输入保持 `unknown` 并校验后再转换，禁止 `any`、非空断言和双重断言；详见 [TypeScript 规范](./typescript-standards.md)。
- 测试按模块能力和可验证行为就近放置，禁止按页面数量机械创建。公式、解析、状态、公共能力和缺陷修复必须补同目录测试；纯页面组合通常不测试。当前只支持 `.test.ts` 基础测试，DOM 组件测试和 E2E 必须在真实需求出现后单独接入，详见 [测试规范](./testing-standards.md)。
- 对金额、收益率、交易状态、权限、时间和时区等高风险领域，优先写出单位、精度、时区、空值和错误处理约定；未明确时标为待定，不得自行假设。
- 新增多页面复用的量化短词时，优先补入 `shared/i18n/locales` 的 `terms.*` 分组并复用现有 key；页面说明、操作提示和完整句子仍放所属页面/功能分组。中英文语言包的叶子 key 必须保持一致，测试会校验。
- 文档示例必须与当前代码一致。修改入口、命令或变量名时，同步检索并修正文档中的旧名称。
- 无障碍（a11y）不在当前项目范围内。不要自行添加无障碍库、专用样式、键盘交互或测试；若未来范围变化，须先更新开发规范再实施。
- 不要创建 `src/hooks`。先按 [Hook 归属规则](./architecture.md#hook-归属规则) 判断领域；例如浏览器能力归入 `shared/lib/<capability>`，业务 Hook 留在业务 slice。一个能力目录的公共 Hook 只经其 `index.ts` 导出。
- 添加文件前先检查目标目录是否仍只描述一个概念。若新文件代表第二个可独立演进的能力，先新建子目录；同一概念的实现、样式、类型、测试、说明和入口文件可共存。禁止把目录当作无限收纳盒，示例见 [目录粒度规则](./architecture.md#目录粒度规则)。
- 业务资源放在拥有它的模块 `assets/`，禁止创建全局 `src/assets`。新增资源前先检索 `shared/assets` 与相关 entity 的现有资源；第二个真实消费者出现时，移动到共同允许依赖的最低层、从资源目录 `index.ts` 导入并删除旧副本。不得复制资源或深层导入同层业务 slice 的资源，详见 [资源归属与提升规则](./architecture.md#资源归属与提升规则)。
- `src` 未引用资源通常不会进入 Vite 产物，但 AI 仍必须随功能替换/删除一并清理，不能保留“以后可能使用”的素材。资源只可经静态 import 或 SCSS `url()` 使用；`public/` 文件无论是否引用都会进入部署产物，必须具有可追溯的固定 URL 用途。当前不添加容易误报的全量资源扫描，未来 `public` 出现真实规模后再独立接入白名单 CI，详见 [资源构建与清理](./architecture.md#资源构建与清理)。
- 不创建 `shared/utils` 或 `shared/lib/utils`。先查 [基础能力边界](./architecture.md#sharedlib-基础能力边界)：已有能力直接复用；新增跨业务能力必须建独立目录、经 `index.ts` 暴露，并同步登记本表。领域算法不可下沉到 `shared/lib`。
- 除 `shared/lib/time` 外，禁止使用 `Date`、`new Date`、`Date.now`、`Date.parse` 或 `Intl.DateTimeFormat`。Oxlint 会阻断这些调用；新增时间能力只能先封装到 `shared/lib/time` 再使用，禁止添加 lint 忽略。
- 除 `shared/lib/decimal` 外，禁止直接导入 `decimal.js`。四则运算可复用该模块；涉及收益、回撤、仓位、手续费等领域公式时，仍须放在所属 `entities`/`features`，先定义业务口径并添加测试。
- 所有私有 `.ts`/`.tsx` 文件禁止出现 `+`、`-`、`*`、`/`、`+=`、`-=`、`*=`、`/=`、`++`、`--`。`npm run lint:arithmetic` 会解析 AST 并阻断；金融/业务值使用 `shared/lib/decimal`，UI 几何/动画才可使用 `shared/lib/number`，文本拼接使用模板字符串。禁止绕过或扩展实现豁免目录。
- 除 `shared/lib/clipboard` 外，禁止直接导入 `copy-to-clipboard` 或自行调用原生 Clipboard API。复制文本只调用 `await copyText`，根据真实的 `true`/`false` 在调用处展示所属页面的本地化反馈。
- 除 `shared/notification` 外，禁止调用原生 `alert`、`confirm`、`prompt`。用户反馈使用 `notification` 的对应方法；传入的文案必须来自调用方 i18n，当前原生回退不代表可跳过未来的定制通知 UI。
- 新增 `shared/ui` 公共组件时，目录必须为 `tld-<component>`，React 导出为 `Tld<Component>`；业务组件不得滥用该前缀。详见 [公共 UI 命名空间](./architecture.md#公共-ui-命名空间)。

## 7. 决策记录

当一个决定会长期影响多个模块时，在 [待办](./todo.md) 中记录待决策项，或新建 `docs/decisions/NNNN-主题.md`。决策记录至少包含：背景、结论、可选方案及取舍、生效范围、后续动作。

当前已确定的关键决策：

- 使用 React 19、TypeScript、Vite 和 React Router 的 HTML5 History 模式。
- 使用 FSD 分层：`app → pages → widgets → features → entities → shared`。
- 仅支持简体中文与 English；非生产环境默认中文，生产环境默认 English。
- 当前阶段的桌面自适应：SCSS + CSS Modules，px 直接对应设计稿尺寸；不使用根字号缩放或 px 自动转换。移动端设计与实现留待单独任务确定。
- 主题使用语义 token：当前为 `dark`、`light`，但主题名不是组件逻辑。新增主题必须补齐 token 契约和中英文名称。
- 全局样式入口仅为 `src/app/styles/index.scss`；字体、reset、初始化、动效和 Sass mixin 分文件维护。新增全局样式前，先确认它不能就近放入模块 `*.module.scss`。
- 高频布局工具类只使用 `_utilities.scss` 定义的 `tld-` 前缀能力；不可生成或使用颜色、主题、业务状态和组件外观类。字号与间距的可用尺度、`gap` 与占位块的区别见开发规范第 6.3 节。
- `npm run lint` 同时执行 Oxlint 和 Stylelint。Stylelint 会阻止重复实现已有 `tld-*` Utility 的确定等价声明；不要添加 `stylelint-disable` 或把新文件加入 `legacyStyleFiles`，应先扩展 Utility 契约。
- Stylelint 会阻止模块 SCSS 中的原始颜色（hex、命名颜色、`rgb()`、`hsl()` 等），包括阴影与渐变。主题颜色只允许定义在 `_tokens.scss`，模块只能使用 `var(--color-*)`。
- 后续 CSS/SCSS class 必须使用小写短横线（kebab-case），以便 VS Code class 扫描插件识别；CSS Modules 使用 `styles['class-name']` 访问，不得新写 camelCase 或下划线 class。既有初始代码不为此规则做无收益迁移。
