# 应用布局

- 职责：提供侧栏导航、顶栏、主题/语言入口和页面 `Outlet` 的跨页面桌面骨架。
- 入口：`index.ts` 导出 `AppLayout`。
- 约束：导航路径来自 `app/config`；布局不承载页面专属请求和业务状态。
- 扩展：跨页面复用的完整展示区块可加入 widget；页面私有视觉留在 page slice。
- 验证：`pnpm run lint && pnpm run build`；改变导航或路由同步检查应用配置。
