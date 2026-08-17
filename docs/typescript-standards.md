# TypeScript 规范

本规范适用于全部 `.ts` 与 `.tsx` 文件。目标不是让类型数量越多越好，而是让接口边界、领域含义和失败路径能被人工与 AI 一次读懂、由工具自动验证。

## 1. 自动强制项

`tsconfig.app.json` 已启用严格模式，`pnpm run build` 会阻断以下问题：

- 隐式 `any`、未处理的 `null` / `undefined`、不完整的函数返回分支；
- 通过下标访问可能不存在的值；
- 将“未传入可选字段”与“显式传入 `undefined`”混为一谈；
- 未使用的局部变量、参数和 switch 穿透。

`pnpm run lint` 还会以 error 阻断：

- `any`；
- 非空断言 `value!`；
- 所有具名函数和类方法缺少显式返回类型；
- 未使用 `import type` 的纯类型导入。

不得通过关闭规则、添加 lint disable、扩大 `tsconfig` exclude 范围或用 `as any` 绕过。类型规则需要调整时，必须先更新本文件、[开发规范](./development-standards.md)和相关测试，再单独说明理由。

## 2. 类型放置与命名

1. 类型与使用它的业务 slice 放在一起：策略相关类型在 `entities/strategy/model`，创建策略请求类型在 `features/create-strategy/model`。禁止建立 `src/types`、`shared/types` 或万能类型文件。
2. 跨业务的浏览器能力、配置和公共组件类型才可放在对应 `shared` 能力目录；外部只能通过目录根 `index.ts` 导入。
3. 对象结构使用 `interface`：组件 Props、请求参数、响应 DTO、领域模型、公共选项、Hook 返回对象、Context 值。
4. `type` 只用于联合、交叉、字面量、泛型工具、映射类型和别名，例如 `type OrderSide = 'buy' | 'sell'`。不要为了统一形式把联合类型写成 interface，也不要把普通对象契约都写成 type。
5. 名称必须表达角色：`StrategyDto` 表示服务端传输数据，`Strategy` 表示前端领域模型，`CreateStrategyRequest` 表示请求体，`StrategyQuery` 表示筛选条件。禁止 `Data`、`Info`、`Type`、`Result` 这类无领域名的泛称。
6. 公共的有限状态使用 `as const` 常量数组配合联合类型；禁止新建 TypeScript `enum`。字符串不能散落在组件内。

## 3. 函数、组件与 Hook

所有具名函数、类方法必须标注返回类型；这是 lint error，不是建议。构造函数除外。

```ts
export interface StrategySummary {
  readonly strategyId: string
  readonly name: string
  readonly status: StrategyStatus
}

export function toStrategySummary(payload: unknown): StrategySummary {
  // 先校验 payload，再返回领域模型
}

export async function loadStrategies(query: StrategyQuery): Promise<StrategySummary[]> {
  // 明确异步结果，而不是依赖推断
}
```

- 没有结果的函数写 `: void`，异步函数写 `: Promise<T>`；不得省略。
- 公共函数、Hook 和组件的参数、返回对象、回调签名都要有命名类型。对象返回值不要让调用方依赖匿名推断结构。
- React 组件返回 `ReactElement`；Props 使用 `<ComponentName>Props` interface。Hook 返回 `<Capability>Controller` 或 `<Capability>State` interface。
- 局部立即回调可由上下文推断；当回调承载业务语义、会跨函数传递或含异步流程时，也应抽出命名签名或明确返回类型。
- 函数只表达一个业务动作。参数超过 3 个、多个参数含义相近或可选项增多时，改为命名的 options/request interface；不要用位置参数猜含义。

## 4. API 边界与未知数据

网络、Storage、URL、第三方 SDK 和浏览器事件都是不可信输入。进入业务逻辑前必须保持为 `unknown` 并校验，不能只因“接口文档如此”就直接断言。

```ts
export interface StrategyDto {
  id: string
  name: string
  status: 'running' | 'paused'
}

export function isStrategyDto(value: unknown): value is StrategyDto {
  // 校验 object、每个必需字段及 status 的允许值
}
```

规则如下：

- 每个业务接口必须在所属 `api`/`model` 中定义请求、响应和错误契约；不要把 `apiClient.get<T>()` 的 `T` 当成运行时校验。
- DTO 与领域模型分开。字段命名、空值、单位、时区或精度不同时，必须在领域 slice 显式转换；不要让组件直接消费未经转换的 DTO。
- `unknown` 必须经过类型守卫、解析函数或已获批准的 schema 校验库后才可使用。校验失败要返回/抛出该接口约定的错误，不能静默伪造业务值。
- 禁止 `any`、`as any`、双重断言（`as unknown as T`）和非空断言 `!`。`as const` 用于静态常量是允许的；其他断言只能出现在已完成运行时检查、且 TypeScript 无法表达窄化的边界处，并要写出原因。
- `catch` 中的错误视为 `unknown`，先用 `instanceof Error` 或守卫收窄后再读取属性。

## 5. 空值、可选字段与集合

- `undefined` 表示“未提供/不适用”，`null` 表示“已知为空”。一个字段在一个契约中只能选定一种语义，并在 DTO、领域模型和 UI 状态中保持一致。
- 可选字段 `field?: T` 只能省略；如果需要显式接受 undefined，写成 `field?: T | undefined` 并说明理由。项目已开启 `exactOptionalPropertyTypes`，不能靠传入 undefined 伪装省略。
- 不要用 `||` 覆盖合法的 `0`、空字符串或 `false`；仅处理 nullish 值时使用 `??`。
- 对数组下标、`Record` 和字典读取必须处理可能不存在的值。项目已开启 `noUncheckedIndexedAccess`，不能假定 `items[0]` 必然存在。
- 需要只读输入时使用 `readonly` 或 `ReadonlyArray<T>`；服务端 DTO 和不应被 UI 修改的领域快照默认只读。需要局部编辑时创建明确的可编辑模型，不要直接修改 DTO。

## 6. 量化领域的类型信息

金额、价格、数量、收益率、回撤、费率与时间不能仅靠 `number` 区分。每个领域字段或函数至少明确：单位、精度、舍入、空值语义和时间/时区。

- 精确金融数值优先以 `string` 在 DTO 和领域模型中传递；计算必须走 `shared/lib/decimal`，并由领域函数声明结果精度和舍入规则。
- `number` 只用于已经确认不需要十进制精确性的 UI 几何、图表像素或动画；禁止把它伪装成价格、金额或收益。
- API 确定时刻必须带时区；展示使用 `shared/lib/time`。交易日、市场日历、账户时区属于领域能力，不得用普通日期字符串临时替代。
- 不允许因为类型尚未确定而填入虚假的 0、空数组或默认状态。应将字段标为可空/待定，或向需求方确认口径。

## 7. AI 实施清单

新建或修改逻辑前，AI 依次检查：

1. 该类型是否属于现有 FSD slice，而非全局收纳目录？
2. 输入来自哪里，是否需要从 `unknown` 校验？输出、错误和空值语义是否可见？
3. 请求 DTO、领域模型、UI Props 是否被错误地混用？
4. 每个具名函数、类方法、组件与公共 Hook 是否标注了准确返回类型？
5. 金融字段是否写明单位、精度、舍入和时区，并使用正确的时间/十进制模块？
6. 是否新增了非空断言、宽泛断言、`any` 或未处理的索引访问？如有，重写实现而不是压制检查。
7. 执行 `pnpm run test`、`pnpm run lint`、`pnpm run build`；新增解析、转换或领域公式时补充对应单元测试。
