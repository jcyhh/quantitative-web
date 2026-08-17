# 环境配置

项目使用 Vite 的 mode 环境文件。已提交的文件只包含可公开的默认值；真实 `.env.development` 是每位开发者的本地文件，Git 会忽略它。不要在开发环境文件中写密钥，即使它不提交，`VITE_` 前缀变量仍会进入浏览器代码。

项目只允许 `development`、`staging`、`production` 三种 Vite mode。`development` 只能运行开发服务器，不能构建部署包；`staging` 与 `production` 才是可构建环境。`vite.config.ts` 会在启动或构建时校验 `VITE_DEPLOY_ENV` 必须与 mode 完全一致；未知 mode、不一致或开发环境构建都会立即失败，避免将错误接口、语言默认值或构建目录发布到错误环境。

| 文件 | 用途 | 使用命令 |
| --- | --- | --- |
| `.env` | 所有环境共享的公开默认值 | 自动加载 |
| `.env.development.example` | 本地开发模板，提交到仓库 | 首次拉取后复制 |
| `.env.development` | 每位开发者本地开发配置，不提交 | `pnpm run dev` |
| `.env.staging` | 预发布验证 | `pnpm run build:staging` |
| `.env.production` | 生产构建 | `pnpm run build` 或 `pnpm run build:production` |

首次克隆或拉取项目后，若本地尚无 `.env.development`，执行：

```bash
cp .env.development.example .env.development
```

后续拉取代码时，保留自己的 `.env.development`；若模板有更新，再手工比较并补充必要字段，禁止用模板直接覆盖本地文件。`VITE_DEPLOY_ENV=development` 必须留在该文件中，否则 Vite 会拒绝启动。

## 构建目录与缓存

每个 Vite mode 只写入自己的输出目录，构建当前环境时只清空该环境目录，不会删除其他环境已生成的产物：

| 命令 | mode | 输出目录 |
| --- | --- | --- |
| `pnpm run build:staging` | `staging` | `dist/staging/` |
| `pnpm run build` / `pnpm run build:production` | `production` | `dist/production/` |

JS 入口、动态 chunk、CSS、图片、字体等经 Vite 构建图处理的静态资源统一输出到 `dist/<mode>/assets/`，文件名固定为 `[name]-[hash][extname]`。内容变化会改变 hash，因此部署端可以为 `assets/` 设置长期不可变缓存。

部署配置必须同时满足：

1. `index.html` 使用 `no-cache` 或短缓存，以便用户获得最新资源清单。
2. `assets/*` 可使用长期缓存和 `immutable`，因为文件名带内容 hash。
3. `public/` 的文件会被原样复制，不带 Vite hash；只放固定 URL 资源，并按业务需要设置保守缓存或自行做版本管理。

前端构建只能生成可缓存的文件名，不能替代 CDN、Nginx 或对象存储的 HTTP 缓存响应头配置。上线环境必须由部署配置落实上述响应头。

## 暂不预设的 Vite 配置

以下配置必须在出现明确条件后作为独立任务确定，禁止 AI 为“配置完整”擅自添加：

- `base` 与 Router basename：仅在确认部署到域名子路径后配置；当前部署根路径保持默认 `/`。
- `build.target` 与 legacy 插件：先确认需要支持的浏览器及最低版本；当前使用 Vite 默认的现代浏览器目标。
- 生产 sourcemap：先确认错误监控平台、上传方式、访问权限和源码泄露风险；当前保持关闭。
- `build.manifest` / SSR：仅在服务端需要读取带 hash 的资源映射或项目引入 SSR 时启用。
- `manualChunks`：以真实构建体积分析为依据，不能按依赖名猜测拆包；当前路由懒加载和 Vite 默认分包已足够。
- PWA、Service Worker、开发服务器 host/port、额外代理重写：均需明确产品、部署或本地联调需求后再配置。

## 已支持的变量

| 变量 | 作用 | 是否进入浏览器 |
| --- | --- | --- |
| `VITE_APP_NAME` | 产品名称 | 是 |
| `VITE_APP_DESCRIPTION` | 入口页 description | 是 |
| `VITE_ROBOTS` | 入口页 robots 策略；内部系统默认 `noindex,nofollow,noarchive` | 是 |
| `VITE_API_BASE_URL` | API 前缀或公开 API 地址 | 是 |
| `VITE_API_TIMEOUT` | 请求超时（毫秒，正整数） | 是 |
| `VITE_DEPLOY_ENV` | 当前 mode 的部署标识：development / staging / production；必须等于 Vite mode | 是 |
| `VITE_DEFAULT_LANGUAGE` | 首次访问时的默认语言：zh-CN / en-US；按 mode 配置 | 是 |
| `API_PROXY_TARGET` | 本地 Vite 代理目标 | 否 |

生产和预发布默认使用同域 `/api` 网关。若部署形态不同，可将 `VITE_API_BASE_URL` 设置为公开 API 地址；不要将密钥、账户、令牌或内网机密放入任何 `VITE_` 变量。

开发与预发布环境默认使用简体中文；生产环境默认使用 English。用户在顶栏手动选择过语言后，本地保存的选择优先于环境默认值。

## 入口 Meta

`index.html` 只维护与本项目通用的入口信息：字符集、桌面视口、产品名称与描述、浏览器主题色、Referrer 策略、robots 策略和浏览器翻译策略。产品名、描述和 robots 值从环境变量注入。

本项目当前定位为内部系统，所有环境默认禁止搜索引擎收录。若未来对外公开，必须先完成域名、分享图、Open Graph/微信分享信息和合规策略的产品确认，再有针对性地修改生产环境的 `VITE_ROBOTS`；不得仅为了“看起来完整”提前添加虚假的分享链接、PWA manifest 或缓存 meta。

## 本地后端联调

当本地后端运行在其他端口时，编辑不提交的 `.env.development`：

```dotenv
API_PROXY_TARGET=http://localhost:8080
```

前端仍请求 `/api/*`，Vite 开发服务器会代理到该地址，避免浏览器跨域问题。若后端没有 `/api` 前缀，可再在 `vite.config.ts` 中为该服务增加明确的路径重写规则。
