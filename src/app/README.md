# 应用装配

- 职责：装配路由、全局 Provider 与全局样式，不承载量化业务逻辑。
- 入口：`App.tsx`；浏览器启动位于 `src/main.tsx`。
- 约束：业务能力必须留在 FSD 的 pages/widgets/features/entities/shared；全局样式仅由 `styles/index.scss` 进入。
- 扩展：路由改动进入 `router` 与 `config`，新的全局 Provider 先确认确有应用级作用域。
- 验证：`pnpm run build && pnpm run lint`。
