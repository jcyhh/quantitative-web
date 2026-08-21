# Quant Lab Web

量化项目的前端基础工程，基于 React 19、TypeScript 与 Vite。

## 开始开发

```bash
pnpm install
cp .env.development.example .env.development
pnpm run dev
```

`.env.development` 是本地文件，不提交；拉取代码后若模板更新，手工合并所需字段，不要覆盖个人后端配置。完整环境规则见 [docs/environment.md](docs/environment.md)。

## 目录约定

```
electron/         # Electron 主进程与受限桌面桥接，不属于 React FSD 层
src/
├── app/          # 应用启动、路由与全局配置
├── entities/     # 业务实体及其模型
├── features/     # 可独立演进的业务功能
├── pages/        # 路由级页面
├── shared/       # 无业务归属的公共能力
└── widgets/      # 可跨页面复用的界面区块
```

项目采用 Feature-Sliced Design（FSD）；详细分层与依赖规则见 [docs/architecture.md](docs/architecture.md)。

业务图片、图标等资源跟随所属模块的 `assets/`，不建立集中式 `src/assets`；跨模块真实复用时再提升到共同的 entity 或 `shared/assets`，统一从资源目录 `index.ts` 导入。完整规则见 [资源归属与提升规则](docs/architecture.md#资源归属与提升规则)。

所有协作者（包括 AI）应遵守 [docs/development-standards.md](docs/development-standards.md)、[docs/typescript-standards.md](docs/typescript-standards.md) 与 [docs/testing-standards.md](docs/testing-standards.md)。AI 开发的必读顺序、文档最低信息标准和基础设施入口见 [docs/ai-collaboration.md](docs/ai-collaboration.md)。

团队统一使用 Codex 进行 AI 代码协作。共享 workflow 位于 `.agents/skills/`，Codex 在改代码前必须阅读 `AGENTS.md` 与匹配的 Skill；其与 Agent、Markdown 规范、lint 和 CI 的分工见 [docs/ai-skills.md](docs/ai-skills.md)。

## 可用命令

- `pnpm run dev`：启动本地开发服务器
- `pnpm run build`：类型检查并构建生产包到 `dist/production/`
- `pnpm run build:staging`：构建预发布包到 `dist/staging/`
- `pnpm run desktop:dev`：以 Electron 窗口调试本地 React 应用
- `pnpm run desktop:build`：构建生产 Web 渲染层和 Electron 主进程
- `pnpm run desktop:package`：按当前系统平台生成桌面安装包到 `release/`
- `pnpm run desktop:package:mac` / `pnpm run desktop:package:win`：请求 macOS DMG 或 Windows NSIS 产物；正式跨平台发布应在对应平台 CI 构建
- `pnpm run lint`：执行 TypeScript/React 与 SCSS 规范检查
- `pnpm run test`：执行基础能力单元测试

项目唯一包管理器为 pnpm `10.28.2`。禁止使用 npm、yarn、npx、bun 或其他锁文件执行项目命令；执行守卫会阻断错误包管理器及 `package-lock.json`、`yarn.lock` 等混入。新增依赖使用 `pnpm add <package>` 或 `pnpm add -D <package>`，并在同一提交更新 `package.json` 与 `pnpm-lock.yaml`。

pnpm 默认不执行依赖的安装期脚本，只有已审查且记录在 `pnpm-workspace.yaml` 的包可执行。目前仅允许 Vite 所需的 `esbuild` 和文件监听所需的 `@parcel/watcher`。Electron-builder 带入的 `electron-winstaller` 是未获批准的 Squirrel Windows 辅助包；当前使用 NSIS 目标，不能因安装警告而批准它。新增白名单前必须说明包名、脚本用途与风险，并使用 `pnpm approve-builds <明确包名>`；禁止使用全量批准命令。

GitHub Actions 会在推送和 PR 中执行 lint、测试、生产/预发布 Web 构建和 Electron host 编译；工作流见 `.github/workflows/ci.yml`。带签名的桌面安装包由单独的发布任务在相应平台构建。

## 基础能力

- 路由：`src/app/router/router.tsx` 集中维护，使用 HTML5 History 模式，支持页面懒加载与路由错误页。资源详情使用语义化路径参数（如 `/strategies/:strategyId`），查询参数仅用于可选视图状态；生产环境需将所有非静态页面请求回退至 `index.html`。
- 请求：从 `src/shared/api` 导入 `apiClient`；基础地址由 `VITE_API_BASE_URL` 配置，参考 `.env.example`。
- 多语言：从 `src/shared/i18n` 管理；当前仅支持简体中文与 English，可通过顶栏切换。开发/预发布默认中文，生产默认 English。
- 公共配置：从 `src/shared/config` 导入，集中维护应用、接口、语言、默认展示时区、分页与本地存储的默认设置；LocalStorage 从 `src/shared/lib/storage` 统一读写。
- 项目常量：从 `src/shared/constants` 导入 `projectConstants`，集中维护项目短名、缩写和公共静态资源路径；环境可覆盖的应用名称仍由 `shared/config` 管理。
- 基础工具：展示数值使用 `src/shared/lib/format`；日期使用 `src/shared/lib/time`；文件下载使用 `src/shared/lib/download`。不要新建万能 `utils` 目录。
- 剪贴板：从 `src/shared/lib/clipboard` 使用 `await copyText`；底层固定使用哇学社线上验证过的 `copy-to-clipboard`，调用方按 `Promise<boolean>` 结果自行显示多语言反馈。
- 通知：从 `src/shared/notification` 导入 `notification`。当前临时使用原生对话框，已预留 `success`、`info`、`warning`、`error`、`confirm` 方法；后续定制通知 UI 只替换内部实现。
- 精确运算：从 `src/shared/lib/decimal` 使用 `decimalAdd`、`decimalSubtract`、`decimalMultiply`、`decimalDivide`；输入和结果优先使用字符串，业务公式仍留在对应领域模块。
- 普通数值运算：仅 UI 几何、动画等非金融场景可从 `src/shared/lib/number` 使用 `numberAdd`、`numberSubtract`、`numberMultiply`、`numberDivide`；禁止用于金额、价格、数量和收益。
- 响应式样式：使用 SCSS + CSS Modules。全局 token、断点与重置在 `src/app/styles`；业务模块就近维护 `*.module.scss`。当前仅验收最低 1024px 的桌面端，并在 1280px 做紧凑桌面布局；使用流式容器和弹性栅格为后续移动端适配留出空间。设计稿常规尺寸可直接写 px。
- 桌面应用：Electron 壳位于 `electron/`，以 `quantlab://` 本地协议加载 `dist/production/` 的同一套 React SPA。主进程默认开启 context isolation 与 sandbox、关闭 renderer Node integration；桌面 API 仅可通过受限 preload + IPC 增加，完整扩展步骤见 [electron/README.md](electron/README.md)。

环境配置与本地 API 联调见 [docs/environment.md](docs/environment.md)。

仓库治理待办见 [docs/todo.md](docs/todo.md)。
