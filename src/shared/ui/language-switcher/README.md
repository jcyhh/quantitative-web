# 语言切换器

- 职责：提供受控的中文/英文切换 UI。
- 入口：`index.ts` 导出 `LanguageSwitcher`。
- 约束：可选语言来自 `shared/i18n`；组件不自行读写 Storage 或维护另一套语言列表。
- 扩展：新增语言必须先获得产品确认，再在 i18n 配置和所有语言资源中完整登记。
- 验证：`pnpm run test && pnpm run lint && pnpm run build`。
