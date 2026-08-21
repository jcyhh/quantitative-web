# PWA 预留能力

- 职责：保留安装生命周期监听和安装状态 Hook，不启用 PWA 发布能力。
- 入口：`index.ts` 导出初始化函数与 `usePwaInstall` 相关类型。
- 约束：当前禁止添加 manifest、Service Worker 注册、缓存策略、PWA 插件或安装入口。
- 扩展：真实 PWA 需求出现后，按 `docs/pwa.md` 独立确认安全边界、测试、CI 和发布策略。
- 验证：`pnpm run lint && pnpm run build`。
