# 主题

- 职责：应用、持久化和切换注册主题，并提供主题 Context 与过渡能力。
- 入口：`index.ts` 导出 `ThemeProvider`、主题 Hook、初始化和过渡能力。
- 约束：主题名只在 config 注册；组件不得直接写主题判断、根节点属性或 View Transition 调用。
- 扩展：新增主题时同步 `shared/config/theme.ts`、全部 token、两种语言名称和已有页面验证。
- 验证：`pnpm run lint && pnpm run build`；改变持久化或切换状态时补就近测试。
