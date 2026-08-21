# 多语言

- 职责：初始化 i18next，维护中文和英文资源，以及语言切换能力。
- 入口：`index.ts` 导出初始化副作用、语言配置与 `useAppLanguage`。
- 约束：所有用户可见文本必须使用语言 key；`zh-CN` 与 `en-US` 的叶子 key 保持一致。
- 扩展：新增 key 时同步两个语言包和所属模块；不以共享短词替代完整业务句子。
- 验证：`pnpm run test && pnpm run lint && pnpm run build`。
