# PWA 预留能力

当前项目**未启用 PWA**：没有 manifest、PWA 图标、Service Worker 注册、离线缓存策略或安装入口。本文件和 `shared/lib/pwa` 仅预留未来启用时需要的运行时安装能力。

应用启动时会初始化一次安装事件监听，以免未来安装入口在较晚挂载时错过浏览器派发的 `beforeinstallprompt`。这不会注册 Service Worker、不会生成缓存、不会显示入口；在当前没有 PWA 入口文件的情况下，浏览器也不会产生安装提示。

## 已提供的 Hook

从 `shared/lib/pwa` 导入 `usePwaInstall`：

```tsx
const { canInstall, isInstalled, supportsInstall, install } = usePwaInstall()
```

| 返回值 | 含义 |
| --- | --- |
| `canInstall` | 浏览器已派发安装提示，且应用尚未安装。 |
| `isInstalled` | 当前独立窗口运行，或浏览器已触发 `appinstalled`。 |
| `supportsInstall` | 当前环境具备 PWA 安装条件；不代表已经拿到安装提示。 |
| `install()` | 调起浏览器安装提示，返回 `accepted`、`dismissed` 或 `unavailable`。 |

Hook 监听 `beforeinstallprompt`、`appinstalled` 和 `(display-mode: standalone)`；安装状态只通过统一的 `shared/lib/storage` 持久化，禁止业务代码直接读取 Web Storage。

## 启用前置条件（当前不要执行）

未来单独立项启用 PWA 时，必须一起确定并实现：

1. `manifest.webmanifest`、图标与入口 Meta；
2. Service Worker 注册、更新策略、缓存范围和版本回滚策略；
3. 内部量化数据、账户信息和 API 响应的缓存安全边界；
4. 安装入口 UI、浏览器不支持时的交互和验收范围；
5. 真实 HTTPS 环境下的安装、更新、卸载与离线验证。

在上述内容经确认前，禁止注册或模拟 Service Worker，不要添加 PWA 插件、manifest、图标、安装入口和缓存逻辑。`main.tsx` 中已有的安装事件监听是唯一允许的 PWA 初始化。
