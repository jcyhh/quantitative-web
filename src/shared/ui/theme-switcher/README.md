# 主题切换器

- 职责：提供注册主题的选择 UI，并从交互元素发起主题过渡。
- 入口：`index.ts` 导出 `ThemeSwitcher`。
- 约束：必须使用 `shared/theme` 的 `useThemeTransition`；不得直接改主题属性或调用浏览器 View Transition API。
- 扩展：主题选项来自共享配置和 i18n，不在组件内硬编码主题名或显示文案。
- 验证：`pnpm run lint && pnpm run build`。
