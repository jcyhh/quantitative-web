# 全局样式

- 职责：登记主题 token、固定色、字体、reset、初始化、动效、mixin 和受控工具类。
- 入口：`index.scss`，只能由应用启动处导入一次。
- 约束：业务视觉只能写在模块 `*.module.scss`；组件只可按需引用 `_mixins.scss`，原始颜色只在 `_colors.scss` 或 `_tokens.scss`。
- 扩展：新增全局能力前先确认不能就近属于模块样式，并同步开发规范与 Stylelint 映射。
- 验证：`pnpm run lint && pnpm run build`。
