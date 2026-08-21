# 应用配置

- 职责：维护应用内导航项与语义化路由路径。
- 入口：`routes.ts` 导出 `routePaths`；`navigation.ts` 导出 `navigationItems`。
- 约束：资源 ID 使用领域路径参数；查询参数只表达筛选、排序、分页或 Tab 等可选视图状态。
- 扩展：新增路由时同步 router、导航（如适用）、中英文文案与相关页面说明。
- 验证：`pnpm run build && pnpm run lint`。
