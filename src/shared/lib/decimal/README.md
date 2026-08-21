# 十进制运算

- 职责：提供 40 位有效数字、`ROUND_HALF_UP` 的基础十进制加减乘除。
- 入口：`index.ts` 导出 `decimalAdd`、`decimalSubtract`、`decimalMultiply`、`decimalDivide`。
- 约束：金融/业务数值优先使用字符串；本模块不定义收益、回撤、手续费等领域公式；除数为零会抛错。
- 扩展：领域口径仍留在 entities/features；不得让业务模块直接导入 `decimal.js`。
- 验证：`decimal.test.ts` 与 `pnpm run test && pnpm run lint && pnpm run build`。
