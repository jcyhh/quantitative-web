# ECharts 图表组件

- 职责：封装 ECharts 初始化、类型化 option、尺寸变化响应、销毁和可访问名称，供 Web 页面复用。
- 入口：从 `src/shared/ui/tld-echart` 导入 `TldEChart`、`EChartOption` 和 `readEChartCssVariable`。
- 约束：页面只传递 option 和展示属性，不直接导入 `echarts` 或操作实例；图表数据、单位、时间范围、空态和错误态由所属页面或业务模块负责。
- 主题：图表颜色优先读取语义化 CSS token，例如 `readEChartCssVariable('--color-positive')`；不要在页面 option 中复制主题色或写固定业务颜色。
- 扩展：组件只注册当前封装需要的 ECharts 模块（目前为折线图、Grid、Tooltip 和 Canvas renderer）；新增图表类型时同步注册并评估构建体积。
- 生命周期：组件挂载时初始化，option 变化时更新，卸载时销毁；尺寸由 `ResizeObserver` 监听，不在页面中手动管理实例。
- 验证：`pnpm run test && pnpm run lint && pnpm run build`；真实图表新增或变更时补充对应视口和交互验收。

## 页面中的使用方式

```tsx
import { useMemo } from 'react'
import { TldEChart, readEChartCssVariable, type EChartOption } from 'src/shared/ui/tld-echart'

const option: EChartOption = useMemo(
    () => ({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: ['周一', '周二', '周三'] },
        yAxis: { type: 'value' },
        series: [
            { type: 'line', data: [120, 132, 101], itemStyle: { color: readEChartCssVariable('--color-positive') } },
        ],
    }),
    [],
)

return <TldEChart option={option} ariaLabel="收益曲线" height={280} />
```

实际业务接入时，建议把 option builder 放在所属 page/widget 的 `model` 或 `lib` 中，页面组件只负责传入经过格式化的数据和 `ariaLabel`。不要为了复用 option 而把策略、组合或行情业务口径下沉到 `shared/ui`。
