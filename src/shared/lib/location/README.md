# 位置能力

- 职责：读取浏览器当前地理位置，并按调用方参数返回浏览器原始坐标或 GCJ-02 坐标；同时统一处理不支持、权限拒绝、超时、位置不可用和无效坐标错误。
- 入口：从 `index.ts` 导入 `getCurrentLocation`、`wgs84ToGcj02`、`LocationError` 和相关类型。
- 默认值：`getCurrentLocation()` 返回浏览器 Geolocation API 提供的原始坐标（通常为 WGS-84）；需要国标 GCJ-02 时显式传入 `{ coordinateSystem: 'gcj02' }`。
- 约束：本模块只负责浏览器定位、坐标校验和坐标转换，不负责权限弹窗、IP 定位、注册归属地、地图展示或业务接口提交；权限提示由浏览器原生处理，页面文案应根据 `LocationError.code` 由调用方使用 i18n 提供。
- SSR/运行时：没有 `navigator.geolocation` 时返回 `LocationError`，不会访问不存在的浏览器对象；Electron renderer 使用同一浏览器 API，需由运行环境提供定位权限。
- 扩展：新增坐标系时先在 `LocationCoordinateSystem` 中定义，并在 `getCurrentLocation` 的转换边界补实现和测试；不要把地区解析或地图 SDK 依赖放入本目录。
- 验证：运行 `location.test.ts`，并执行 `pnpm run test && pnpm run lint && pnpm run build`；真实浏览器权限和设备定位仍需在 HTTPS 环境人工复测。

## 使用方式

```ts
import { getCurrentLocation } from 'src/shared/lib/location'

const browserCoordinate = await getCurrentLocation({ coordinateSystem: 'browser' })
const gcj02Coordinate = await getCurrentLocation({ coordinateSystem: 'gcj02' })
```

`LocationCoordinate` 使用数字经度和纬度返回，不在公共层截断小数或拼接成字符串。需要提交给特定后端接口时，由所属业务模块按该接口的数据契约负责格式化。
