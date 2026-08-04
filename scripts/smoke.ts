/* 核心逻辑冒烟测试：用合成 K 线数据验证 指标 / 公式引擎 / 选股 / 格式化。
 * 通过 esbuild 打包为 Node 可执行文件后运行，不依赖浏览器。 */
import {
  sma,
  computeMACD,
  computeRSI,
  computeBOLL,
  computeKDJ,
  computeWR,
  computeDMI,
  computeDMA,
} from '@/utils/indicators';
import { runFormula } from '@/utils/formula';
import { evaluateStrategies } from '@/utils/selectors';
import {
  codeToSecid,
  parseSecid,
  changeColor,
  formatPercent,
  formatNum,
} from '@/utils/format';
import type { Kline, FormulaContext, SelectStrategy, StrategyType } from '@/types';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, extra = '') {
  if (cond) {
    pass += 1;
    console.log('  ✓', name);
  } else {
    fail += 1;
    console.log('  ✗ FAIL:', name, extra);
  }
}

// ---- 合成 80 根严格上涨的 K 线 ----
const N = 80;
const open: number[] = [];
const high: number[] = [];
const low: number[] = [];
const close: number[] = [];
const vol: number[] = [];
const amount: number[] = [];
let p = 10;
for (let i = 0; i < N; i += 1) {
  const o = p;
  p = p + 0.3 + (i % 3) * 0.05;
  const c = p;
  const hi = Math.max(o, c) + 0.1 + (i % 2) * 0.05;
  const lo = Math.min(o, c) - 0.1 - (i % 2) * 0.05;
  open.push(o);
  high.push(hi);
  low.push(lo);
  close.push(c);
  vol.push(1000 + i * 20 + (i % 4) * 50);
  amount.push(close[i] * vol[i]);
}
const klines: Kline[] = Array.from({ length: N }, (_, i) => ({
  date: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
  open: open[i],
  high: high[i],
  low: low[i],
  close: close[i],
  volume: vol[i],
  amount: amount[i],
}));
const ctx: FormulaContext = { open, high, low, close, vol, amount };

console.log('Indicators:');
const sma5 = sma(close, 5);
let last5 = 0;
for (let i = N - 5; i < N; i += 1) last5 += close[i];
check('SMA5 末值 = 最近5日均值', Math.abs(sma5[N - 1] - last5 / 5) < 1e-9, `${sma5[N - 1]} vs ${last5 / 5}`);

const macd = computeMACD(close, 12, 26, 9);
check('MACD 数组长度一致', macd.dif.length === N && macd.dea.length === N && macd.macd.length === N);
check('MACD.dif 末值非 NaN', !Number.isNaN(macd.dif[N - 1]));

const rsi = computeRSI(close, 6);
check('RSI 落在 [0,100]', rsi.every((v) => Number.isNaN(v) || (v >= 0 && v <= 100)));

const boll = computeBOLL(close, 20, 2);
check(
  'BOLL upper>=mid>=lower',
  boll.upper[N - 1] >= (boll.mid[N - 1] ?? -Infinity) - 1e-9 &&
    (boll.mid[N - 1] ?? -Infinity) >= boll.lower[N - 1] - 1e-9,
);

const kdj = computeKDJ(high, low, close, 9);
check('KDJ 三条线长度一致', kdj.k.length === N && kdj.d.length === N && kdj.j.length === N);

const wr = computeWR(high, low, close, 14);
check('WR 落在 [0,100]', wr.every((v) => Number.isNaN(v) || (v >= 0 && v <= 100)));

const dmi = computeDMI(high, low, close, 14, 6);
check('DMI 三条线长度一致', dmi.pdi.length === N && dmi.mdi.length === N && dmi.adx.length === N);

const dma = computeDMA(close, 10, 50, 10);
check('DMA/DMAma 长度一致', dma.dma.length === N && dma.ama.length === N);

console.log('Formula engine:');
const r1 = runFormula('MA(CLOSE,5)', ctx);
check('MA(CLOSE,5) 无错误', !r1.error && !!r1.series);
check(
  'MA(CLOSE,5) === sma(close,5)',
  !!r1.series && r1.series.every((v, i) => Math.abs(v - sma5[i]) < 1e-9 || (Number.isNaN(v) && Number.isNaN(sma5[i]))),
);

const r2 = runFormula('CROSS(MA(CLOSE,5), MA(CLOSE,10))', ctx);
check('CROSS 返回 0/1 序列', !!r2.series && r2.series.every((v) => v === 0 || v === 1));

const r3 = runFormula('RSI(CLOSE,6) < 30', ctx);
check('RSI<30 返回 0/1 序列', !!r3.series && r3.series.every((v) => v === 0 || v === 1));

const r4 = runFormula('COUNT(CLOSE>OPEN,5) >= 3', ctx);
check('COUNT>=3 返回 0/1 序列', !!r4.series && r4.series.every((v) => v === 0 || v === 1));

const r5 = runFormula('CLOSE = HHV(CLOSE,20)', ctx);
check('CLOSE=HHV 返回 0/1 序列', !!r5.series && r5.series.every((v) => v === 0 || v === 1));

const r6 = runFormula('MA(', ctx);
check('残缺表达式返回错误', !!r6.error);

const r7 = runFormula('FOO(CLOSE,1)', ctx);
check('未知函数返回错误', !!r7.error);

const r8 = runFormula('MA(CLOSE,5) > MA(CLOSE,10) && MA(CLOSE,10) > MA(CLOSE,20)', ctx);
check('多条件逻辑表达式返回 0/1', !!r8.series && r8.series.every((v) => v === 0 || v === 1));

console.log('Selectors:');
const ALL: StrategyType[] = [
  'MA_MULTI', 'MA5_CROSS_MA10', 'MA10_CROSS_MA20', 'MACD_GOLD', 'MACD_ABOVE_ZERO',
  'RSI_BELOW_30', 'RSI_CROSS_50', 'VOL_UP_GOING', 'VOL_BREAK_PLATFORM',
  'NEW_HIGH_5', 'NEW_HIGH_10', 'NEW_HIGH_20', 'CONTINUE_YANG', 'CONTINUE_VOL', 'VOL_SHRINK_PULLBACK',
];
const strategies: SelectStrategy[] = ALL.map((t) => ({ type: t, enabled: true, params: {} }));
const matched = evaluateStrategies(klines, strategies);
check('evaluateStrategies 返回数组且不抛错', Array.isArray(matched));
check('强上涨序列命中 MA_MULTI', matched.includes('MA_MULTI'), JSON.stringify(matched));
check('强上涨序列命中 NEW_HIGH_20', matched.includes('NEW_HIGH_20'));
check('强上涨序列不命中 RSI_BELOW_30', !matched.includes('RSI_BELOW_30'));
check('数据不足(<62) 返回空', evaluateStrategies(klines.slice(0, 10), strategies).length === 0);

console.log('Format:');
check("codeToSecid('600519').secid === '1.600519'", codeToSecid('600519').secid === '1.600519');
check("codeToSecid('000001').secid === '0.000001'", codeToSecid('000001').secid === '0.000001');
const ps = parseSecid('1.600519');
check("parseSecid('1.600519').code === '600519'", ps.code === '600519');
check('formatPercent 含 %', formatPercent(1.234).includes('%'));
check('formatNum 返回字符串', typeof formatNum(1234.5) === 'string');
check('changeColor 返回颜色', typeof changeColor(1) === 'string');

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
