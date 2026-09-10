# 高德地图公共能力

- 职责：按需加载高德地图 JS API 2.0，提供逆地址解析、地图选点控制器和官方导航 URI；地图选点的 React 展示统一使用 `shared/ui/tld-amap-picker`。
- 入口：从 `src/shared/lib/amap` 导入 `reverseGeocodeAddress`、`openAmapNavigation`、`buildAmapNavigationUrl`、`createAmapPointPicker`、`amapClient` 和相关类型。
- 配置：Web Key 从 `VITE_AMAP_WEB_KEY` 读取；2021-12-02 之后申请的 Key 按高德要求同时配置 `VITE_AMAP_SECURITY_JS_CODE`。两者都会进入浏览器代码，只能使用限制了部署域名的 Web JS API 凭据，不能填写 Web 服务端 Key、私钥或其他服务凭据。
- 坐标：地图 JS API 与地图选点使用 GCJ-02。浏览器原始定位需先调用 `getCurrentLocation({ coordinateSystem: 'gcj02' })`；导航 URI 可通过 `coordinateSystem` 显式选择 `gcj02` 或 `wgs84`。
- 约束：业务不得直接导入 `@amap/amap-jsapi-loader`、读取 `window.AMap`、自行拼接高德 URI 或解析 SDK 原始响应。公共层只返回稳定字段，不把 SDK 实例暴露给页面。
- 加载：SDK 只在首次调用地图能力时动态加载；Loader 会复用加载结果，失败后允许下一次调用重新尝试。公共层兼容 Loader 1.0.1 类型声明与 CommonJS 实际导出的差异，不依赖未经校验的命名导出。未配置 Key、非浏览器环境、非法坐标或无效 SDK 响应统一抛出 `AmapError`。
- 扩展：新增搜索、路线规划、覆盖物或控件时先扩展本能力的 SDK 类型和加载插件清单，再由 `tld-` 公共 UI 或所属业务模块消费；不要把地图业务状态放进 shared。
- 验证：运行 `pnpm run test && pnpm run lint && pnpm run build`；真实 SDK 加载、配额、域名白名单、逆解析和 App 调起仍需在配置有效 Key 的 HTTPS 环境人工复测。

## 环境配置

```dotenv
VITE_AMAP_WEB_KEY=你的高德Web端JS API Key
VITE_AMAP_SECURITY_JS_CODE=对应的安全密钥
```

`VITE_` 变量不是服务端秘密。生产和预发布环境应通过部署平台注入，不要把真实值提交到仓库。

## 地址逆解析

```ts
import { reverseGeocodeAddress } from 'src/shared/lib/amap'

const address = await reverseGeocodeAddress({
    longitude: 113.54,
    latitude: 34.82,
})

address.formattedAddress
address.province
address.city
address.district
address.township
address.street
address.streetNumber
address.adcode
address.citycode
```

返回字段统一为字符串。高德在直辖市或境外地址中可能不返回部分层级，缺失字段使用空字符串，不由公共层推导不存在的省/市地区码。

## 打开高德导航

```ts
import { openAmapNavigation } from 'src/shared/lib/amap'

function handleNavigate(): void {
    openAmapNavigation(
        { longitude: 113.54, latitude: 34.82, name: '目的地' },
        {
            mode: 'car',
            coordinateSystem: 'gcj02',
            callNative: true,
        },
    )
}
```

默认新窗口打开 `https://uri.amap.com/navigation`，并在移动端尝试调起高德地图 App；未安装 App、桌面浏览器或受限制的内置浏览器由高德 Web 页面承接。必须在用户点击等直接交互中调用，避免被浏览器弹窗策略阻止。需要当前页打开时传 `{ target: '_self' }`。

## 地图选点

页面优先使用 [`TldAmapPicker`](../../ui/tld-amap-picker/README.md)。只有实现其他框架适配器时才直接使用 `createAmapPointPicker`；控制器提供 `setCoordinate()` 和 `destroy()`，React 组件已自动处理这两个生命周期。

## 官方参考

- [JS API 2.0 Loader 与安全密钥](https://lbs.amap.com/api/javascript-api-v2/guide/abc/load)
- [地理编码与逆地理编码](https://lbs.amap.com/api/javascript-api-v2/guide/services/geocoder)
- [地图 URI 路径规划](https://lbs.amap.com/api/uri-api/guide/travel/route)
