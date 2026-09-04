# 全局样式

- 职责：登记主题 token、固定色、字体、reset、初始化、动效、mixin 和受控工具类。
- 入口：`index.scss`，只能由应用启动处导入一次。
- 约束：业务视觉只能写在模块 `*.module.scss`；组件只可按需引用 `_mixins.scss`，原始颜色只在 `_colors.scss` 或 `_tokens.scss`。
- 选型：当前不引入 Tailwind CSS；SCSS、CSS Modules、语义 Token 和受控 `tld-*` Utility 已覆盖现阶段桌面端需求，并能通过 Stylelint 强制边界。若未来重新选型，必须整体评估迁移，不能长期并行两套 Utility 规则。
- 扩展：新增全局能力前先确认不能就近属于模块样式，并同步开发规范与 Stylelint 映射。
- 验证：`pnpm run lint && pnpm run build`。
