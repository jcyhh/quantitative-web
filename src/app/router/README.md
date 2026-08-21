# 路由

- 职责：使用 React Router 装配页面、懒加载、错误页和未知路径回退。
- 入口：`router.tsx` 导出 `router`。
- 约束：页面只负责组合；业务状态和请求不得堆入路由层。生产部署必须保留 History 回退。
- 扩展：新增页面先创建对应 page slice，再从 `router.tsx` 引用其根入口。
- 验证：`pnpm run build && pnpm run lint`。
