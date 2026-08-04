import type { Kline, KlinePeriod, TimeSharePoint } from '@/types';
import { http, toNumber, str } from '@/services/http';
import { secidToSymbol } from '@/services/batchQuote';

/**
 * 备用 K 线 / 分时数据源。
 * 默认源（同花顺）或主源偶发不可用时，StockService 会回退到这里的实现。
 * 全部走 Vite 代理：/tk -> web.ifzq.gtimg.cn（腾讯），/sk -> quotes.sina.cn（新浪）。
 */

const TENCENT_KLINE_KEY: Record<'day' | 'week' | 'month', string> = {
  day: 'qfqday',
  week: 'qfqweek',
  month: 'qfqmonth',
};

/** 腾讯前复权日/周/月 K 线（web.ifzq.gtimg.cn）。返回顺序：date, open, close, high, low, volume */
export async function fetchTencentKline(
  secid: string,
  period: 'day' | 'week' | 'month',
  count = 120,
): Promise<Kline[]> {
  const symbol = secidToSymbol(secid);
  const res = await http.get('/tk/appstock/app/fqkline/get', {
    params: { param: `${symbol},${period},,,${count},qfq` },
  });
  const node = res.data?.data?.[symbol];
  if (!node) return [];
  const rows: unknown[] = node[TENCENT_KLINE_KEY[period]] ?? [];
  return rows.map((r: unknown) => {
    const p = r as string[];
    return {
      date: str(p[0]),
      open: toNumber(p[1]),
      close: toNumber(p[2]),
      high: toNumber(p[3]),
      low: toNumber(p[4]),
      volume: toNumber(p[5]),
      amount: toNumber(p[6]),
    };
  });
}

const SINA_SCALE: Record<'min5' | 'min15' | 'min30' | 'min60', number> = {
  min5: 5,
  min15: 15,
  min30: 30,
  min60: 60,
};

/** 新浪分钟 K 线（quotes.sina.cn）。腾讯/同花顺均无稳定分钟端点，用新浪兜底。 */
export async function fetchSinaMinuteKline(
  secid: string,
  period: 'min5' | 'min15' | 'min30' | 'min60',
  count = 320,
): Promise<Kline[]> {
  const symbol = secidToSymbol(secid);
  const res = await http.get('/sk/cn/api/json_v2.php/CN_MarketDataService.getKLineData', {
    params: { symbol, scale: SINA_SCALE[period], ma: 'no', datalen: count },
  });
  const rows: Partial<Record<'day' | 'open' | 'high' | 'low' | 'close' | 'volume' | 'amount', string>>[] =
    Array.isArray(res.data) ? res.data : [];
  return rows.map((r) => ({
    date: str(r.day),
    open: toNumber(r.open),
    close: toNumber(r.close),
    high: toNumber(r.high),
    low: toNumber(r.low),
    volume: toNumber(r.volume),
    amount: toNumber(r.amount),
  }));
}

/** 腾讯分时（web.ifzq.gtimg.cn）。昨收从 qt 字段取，均价由 成交额/成交量 推算。 */
export async function fetchTencentTimeShare(secid: string): Promise<TimeSharePoint[]> {
  const symbol = secidToSymbol(secid);
  const res = await http.get('/tk/appstock/app/minute/query', {
    params: { code: symbol },
  });
  const node = res.data?.data?.[symbol];
  if (!node) return [];
  const qt: unknown[] = node?.qt?.[symbol] ?? [];
  const preClose = toNumber(qt[4]) || 1;
  const pts: string[] = node?.data?.data ?? [];
  return pts.map((line) => {
    const parts = line.split(' ');
    const t = parts[0] ?? '';
    const price = toNumber(parts[1]);
    const volume = toNumber(parts[2]);
    const amount = toNumber(parts[3]);
    const avgPrice = volume > 0 ? amount / (volume * 100) : price;
    return {
      time: `${t.slice(0, 2)}:${t.slice(2, 4)}`,
      price,
      volume,
      avgPrice,
      changePercent: preClose ? ((price - preClose) / preClose) * 100 : 0,
    };
  });
}

export type { KlinePeriod };
