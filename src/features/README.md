# Features

在这里创建可独立发布、测试与复用的业务功能模块，例如 `create-strategy`、`run-backtest`、`rebalance-portfolio`。

每个模块仅通过自身 `index.ts` 暴露公共接口；通用领域类型请放入 `entities`，基础能力请放入 `shared`。
