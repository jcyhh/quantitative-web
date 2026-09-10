# 高德地图选点组件

- 职责：把 `shared/lib/amap` 的选点控制器适配为 React 公共组件，负责地图容器、受控坐标同步、选点回调和卸载清理。
- 入口：从 `src/shared/ui/tld-amap-picker` 导入 `TldAmapPicker` 和 `TldAmapPickerProps`。
- 约束：页面不直接导入高德 Loader、不读取 `window.AMap`、不维护 Marker 或地图实例；组件不提供业务确认弹窗、搜索表单、地址文案和业务状态。
- 坐标：`value` 和回调坐标均按 GCJ-02 使用。浏览器当前位置先调用 `getCurrentLocation({ coordinateSystem: 'gcj02' })`，再传入 `value`。
- 生命周期：组件只在地图配置变化时重建控制器；`value` 变化只移动/清除 Marker。卸载、React StrictMode 重放或异步初始化失效时会销毁旧地图。
- 错误：Key 缺失、SDK 加载或逆解析失败通过 `onError(AmapError)` 返回，页面按 `error.code` 使用所属 i18n 文案展示反馈。
- 样式：默认高度使用 `clamp(280px, 50vh, 480px)`，可通过 `height`、`style` 或 `className` 覆盖。组件只处理地图容器，不提供 Modal 或 Drawer。
- 扩展：搜索框、确认操作和业务字段留在所属 feature/page；新增地图控件或覆盖物时先扩展 `shared/lib/amap` 的控制器与严格类型，再由本组件消费。
- 验证：运行 `pnpm run test:component && pnpm run lint && pnpm run build`；真实地图瓦片、点击、Marker、逆解析和移动端触摸仍需在配置有效 Key 的 HTTPS 页面人工复测。

## 页面使用方式

```tsx
import type { ReactElement } from 'react'
import { useState } from 'react'
import type { AmapCoordinate, AmapPointSelection } from 'src/shared/lib/amap'
import { getCurrentLocation } from 'src/shared/lib/location'
import { TldAmapPicker } from 'src/shared/ui/tld-amap-picker'

export function AddressPicker(): ReactElement {
    const [coordinate, setCoordinate] = useState<AmapCoordinate | null>(null)
    const [selection, setSelection] = useState<AmapPointSelection | null>(null)

    async function locate(): Promise<void> {
        setCoordinate(await getCurrentLocation({ coordinateSystem: 'gcj02' }))
    }

    return (
        <>
            <button type="button" onClick={() => void locate()}>
                获取当前位置
            </button>
            <TldAmapPicker
                value={coordinate}
                onChange={(nextSelection) => {
                    setCoordinate(nextSelection.coordinate)
                    setSelection(nextSelection)
                }}
                onError={(error) => {
                    // 调用方根据 error.code 显示 i18n 错误反馈
                }}
            />
            <p>{selection?.address.formattedAddress}</p>
        </>
    )
}
```

示例中的按钮、地址文本和错误提示属于页面业务文案，必须放入所属模块的中英文语言包；公共组件不硬编码这些文本。需要确认/取消流程时，由业务 Modal/Drawer 包裹本组件并在确认时提交最后一次 `AmapPointSelection`。
