/**
 * 同花顺 Provider 解析层单元测试
 * 用 mock 的真实返回结构验证：行情、K线、分时、搜索。
 * 运行：npx esbuild scripts/tonghuashun-test.ts --bundle --platform=node --format=cjs --alias:@=./src --define:import.meta.env={} --outfile=scripts/_tonghuashun-test.cjs && node scripts/_tonghuashun-test.cjs
 */
import { TonghuashunProvider } from '@/services/providers/TonghuashunProvider';
import { http } from '@/services/http';

const provider = new TonghuashunProvider();

const todayJs =
  'quotebridge_v4_line_hs_601728_01_today({"hs_601728":{"1":"20260730","7":"6.21","8":"6.50","9":"6.20","11":"6.49","13":209893660,"19":"1342849900.00","74":"","1968584":"0.270","66":"","open":0,"dt":"1442","name":"\\u4e2d\\u56fd\\u7535\\u4fe1","marketType":"HS_stock_sh"}})';

const timeJs =
  'quotebridge_v6_time_hs_601728_today({"hs_601728":{"name":"\\u4e2d\\u56fd\\u7535\\u4fe1","open":0,"stop":0,"isTrading":1,"rt":"0930-1130,1300-1500,1505-1530","tradeTime":["0930-1130","1300-1500","1505-1530"],"pre":"6.24","date":"20260730","data":"0930,6.21,3280122,6.210,528200;0931,6.26,13817460,6.235,2214000"}})';

const klineJs =
  'quotebridge_v4_line_hs_601728_01_last({"hs_601728":{"num":140,"total":"1196","year":{"2026":138},"rt":"0930-1130,1300-1500","start":"20210820","name":"\\u4e2d\\u56fd\\u7535\\u4fe1","data":"20260728,6.32,6.40,6.28,6.35,123456789,800000000.00,1.10,,,0;20260729,6.35,6.42,6.30,6.38,98765432,650000000.00,0.80,,,0;20260730,6.38,6.50,6.20,6.49,209893660,1342849900.00,2.30,,,0"}})';

let _callIdx = 0;
const originals = {
  get: (http as unknown as { get: typeof http.get }).get,
};
(http as unknown as { get: typeof http.get }).get = async (url: string, config?: unknown) => {
  _callIdx += 1;
  if (url.includes('/v4/line/') && url.includes('/today.js')) {
    return { data: todayJs, config } as never;
  }
  if (url.includes('/v6/time/')) {
    return { data: timeJs, config } as never;
  }
  if (url.includes('/v4/line/') && url.includes('/last.js')) {
    console.log('MOCK klineJs length', klineJs.length, 'tail', klineJs.slice(-30));
    return { data: klineJs, config } as never;
  }
  throw new Error(`unexpected url: ${url}`);
};

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

async function main() {
  _callIdx = 0;
  const quote = await provider.getQuote('1.601728');
  assert(quote.name === '中国电信', 'quote name');
  assert(quote.open === 6.21, 'quote open');
  assert(quote.high === 6.5, 'quote high');
  assert(quote.low === 6.2, 'quote low');
  assert(quote.price === 6.49, 'quote price');
  assert(quote.preClose === 6.24, 'quote preClose');
  assert(Math.abs(quote.changePercent - (6.49 - 6.24) / 6.24 * 100) < 0.01, 'quote changePercent');
  assert(quote.volume > 0, 'quote volume');
  assert(quote.amount > 0, 'quote amount');
  assert(quote.high > quote.low, 'quote high > low');

  const klines = await provider.getKline('1.601728', 'day');
  assert(klines.length === 3, 'kline length');
  assert(klines[klines.length - 1].close === 6.49, 'kline last close');
  assert(klines.every((k) => k.high >= k.low), 'kline high >= low');

  const points = await provider.getTimeShare('1.601728');
  assert(points.length === 2, 'timeshare length');
  assert(points[0].time === '09:30', 'timeshare first time');
  assert(points[0].avgPrice === 6.21, 'timeshare avgPrice');
  assert(Math.abs(points[1].changePercent - (6.26 - 6.24) / 6.24 * 100) < 0.01, 'timeshare changePercent');

  const search = await provider.search('601728');
  assert(search.length >= 1, 'search by code returns result');
  assert(search.some((s) => s.code === '601728'), 'search contains 601728');

  console.log('\nAll Tonghuashun provider assertions passed.');

  // restore
  (http as unknown as { get: typeof http.get }).get = originals.get;
}

main().catch((e) => {
  console.error(e);
  (http as unknown as { get: typeof http.get }).get = originals.get;
  process.exit(1);
});
