import type { Kline, KlinePeriod, Quote, RankItem, Sector, StockInfo, TimeSharePoint } from '@/types';
import { FALLBACK_STOCKS } from '@/constants';
import { codeToSecid, parseSecid, prefixToMarket } from '@/utils/format';
import { toNumber, str, http } from '@/services/http';
import type { IDataProvider, RankType } from './types';

const THS_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** 把 secid 转成同花顺内部编码。
 *  保留市场前缀避免 000001 歧义（sh000001=上证指数 vs sz000001=平安银行）。
 *  同花顺格式：hs_{market}{code}，如 hs_1600519 / hs_000001（深市默认） */
function toThsCode(secid: string): string {
  const { code, marketPrefix } = parseSecid(secid);
  // 沪市(1)代码加前缀区分；深市(0)保持原样（hs_0xxxxx / hs_3xxxxx 无歧义）
  return marketPrefix === '1' ? `hs_1${code}` : `hs_${code}`;
}

/** 同花顺返回的是 JSONP，例如 quotebridge_v4_line_hs_601728_01_today({...}) */
function parseJSONP(raw: string): unknown {
  const start = raw.indexOf('(');
  const end = raw.lastIndexOf(')');
  if (start < 0 || end <= start) throw new Error('同花顺 JSONP 解析失败');
  const json = raw.slice(start + 1, end);
  return JSON.parse(json);
}

function makeHeaders(refererPath: string): Record<string, string> {
  return {
    'User-Agent': THS_UA,
    Referer: `http://stockpage.10jqka.com.cn/${refererPath}/`,
  };
}

export class TonghuashunProvider implements IDataProvider {
  readonly name = 'tonghuashun' as const;

  async search(keyword: string): Promise<StockInfo[]> {
    const kw = keyword.trim();
    if (!kw) return [];

    // 1. 如果是 6 位数字，尝试验证上海/深圳两个市场是否真实存在
    const numericMatches: StockInfo[] = [];
    if (/^\d{6}$/.test(kw)) {
      for (const prefix of ['1', '0']) {
        const secid = `${prefix}.${kw}`;
        try {
          const code = toThsCode(secid);
          const res = await http.get(`/ths/v4/line/${code}/01/today.js`, {
            responseType: 'text',
            headers: makeHeaders(kw),
          });
          const raw = typeof res.data === 'string' ? res.data : '';
          const data = parseJSONP(raw) as Record<string, Record<string, unknown>>;
          const item = data[code];
          if (item?.name) {
            numericMatches.push({
              code: kw,
              name: str(item.name),
              market: prefixToMarket(prefix),
              secid,
            });
          }
        } catch {
          // ignore
        }
      }
    }

    // 2. 从静态兜底列表里按名称/代码模糊匹配
    const staticMatches = FALLBACK_STOCKS.filter(
      (s) => s.code.includes(kw) || s.name.includes(kw),
    ).map((s) => {
      const parsed = codeToSecid(s.code.replace(/^(1|0)\./, ''));
      return {
        code: parsed.secid.split('.')[1] ?? s.code,
        name: s.name,
        market: parsed.market,
        secid: parsed.secid,
      };
    });

    // 去重（secid 为键）
    const map = new Map<string, StockInfo>();
    [...numericMatches, ...staticMatches].forEach((s) => map.set(s.secid, s));
    return Array.from(map.values()).slice(0, 20);
  }

  async getQuote(secid: string): Promise<Quote> {
    const { code } = parseSecid(secid);
    const thsCode = toThsCode(secid);

    // 取今日 OHLCV 与昨收
    const [quoteRes, timeRes] = await Promise.all([
      http.get(`/ths/v4/line/${thsCode}/01/today.js`, {
        responseType: 'text',
        headers: makeHeaders(code),
      }),
      http.get(`/ths/v6/time/${thsCode}/today`, {
        responseType: 'text',
        headers: makeHeaders(code),
      }),
    ]);

    const quoteRaw = typeof quoteRes.data === 'string' ? quoteRes.data : '';
    const timeRaw = typeof timeRes.data === 'string' ? timeRes.data : '';

    const quoteData = parseJSONP(quoteRaw) as Record<string, Record<string, unknown>>;
    const timeData = parseJSONP(timeRaw) as Record<string, Record<string, unknown>>;

    const q = quoteData[thsCode];
    const t = timeData[thsCode];
    if (!q) throw new Error('同花顺行情数据为空');

    const name = str(q.name) || str(t?.name) || code;
    const open = toNumber(q['7']);
    const high = toNumber(q['8']);
    const low = toNumber(q['9']);
    const price = toNumber(q['11']);
    const volume = toNumber(q['13']);
    const amount = toNumber(q['19']);
    const preClose = toNumber(t?.pre);
    const change = preClose ? price - preClose : 0;
    const changePercent = preClose ? (change / preClose) * 100 : 0;
    const amplitude = preClose ? ((high - low) / preClose) * 100 : 0;

    return {
      code,
      name,
      market: prefixToMarket(parseSecid(secid).marketPrefix),
      price,
      preClose,
      open,
      high,
      low,
      volume,
      amount,
      amplitude,
      changePercent,
      change,
      turnoverRate: NaN,
      bids: [],
      asks: [],
      timestamp: Date.now(),
    };
  }

  async getKline(secid: string, period: KlinePeriod): Promise<Kline[]> {
    const { code } = parseSecid(secid);
    const thsCode = toThsCode(secid);

    // 同花顺：01=日K，02=周K；月K 在该公开端点无数据，用周K兜底
    const thsPeriod = period === 'week' ? '02' : '01';

    const res = await http.get(`/ths/v4/line/${thsCode}/${thsPeriod}/last.js`, {
      responseType: 'text',
      headers: makeHeaders(code),
    });

    const raw = typeof res.data === 'string' ? res.data : '';
    const data = parseJSONP(raw) as Record<string, Record<string, unknown>>;
    // last.js 的返回结构是顶层对象直接含 data；today.js 才是以 hs_xxxxxx 为 key
    const item = (data[thsCode] ?? data) as Record<string, unknown>;
    if (!item?.data) return [];

    const rows = str(item.data).split(';');
    const klines: Kline[] = [];
    for (const row of rows) {
      const parts = row.split(',');
      if (parts.length < 7) continue;
      const [dateStr, openStr, highStr, lowStr, closeStr, volumeStr, amountStr] = parts;
      const ds = dateStr ?? '';
      // 同花顺日期格式 20251230 -> 2025-12-30
      const date = ds.length === 8 ? `${ds.slice(0, 4)}-${ds.slice(4, 6)}-${ds.slice(6, 8)}` : ds;
      klines.push({
        date,
        open: toNumber(openStr),
        high: toNumber(highStr),
        low: toNumber(lowStr),
        close: toNumber(closeStr),
        volume: toNumber(volumeStr),
        amount: toNumber(amountStr),
      });
    }
    return klines;
  }

  async getTimeShare(secid: string): Promise<TimeSharePoint[]> {
    const { code } = parseSecid(secid);
    const thsCode = toThsCode(secid);

    const res = await http.get(`/ths/v6/time/${thsCode}/today`, {
      responseType: 'text',
      headers: makeHeaders(code),
    });

    const raw = typeof res.data === 'string' ? res.data : '';
    const data = parseJSONP(raw) as Record<string, Record<string, unknown>>;
    const item = data[thsCode];
    if (!item?.data) return [];

    const rows = str(item.data).split(';');
    const points: TimeSharePoint[] = [];
    const preClose = toNumber(item.pre);
    for (const row of rows) {
      const parts = row.split(',');
      if (parts.length < 4) continue;
      const [timeStr, priceStr, volumeStr, avgStr] = parts;
      const time = timeStr ?? '';
      const price = toNumber(priceStr);
      points.push({
        time: `${time.slice(0, 2)}:${time.slice(2, 4)}`,
        price,
        volume: toNumber(volumeStr),
        avgPrice: toNumber(avgStr),
        changePercent: preClose ? ((price - preClose) / preClose) * 100 : 0,
      });
    }
    return points;
  }

  async getRankList(_type: RankType, _limit?: number): Promise<RankItem[]> {
    // 同花顺公开端点暂无稳定的涨幅榜/成交额榜接口（q.10jqka.com.cn 页面为 HTML 且需 Cookie），暂返回空
    return [];
  }

  async getSectors(): Promise<Sector[]> {
    // 同上，板块列表暂无稳定公开 JSON 接口
    return [];
  }
}

export const tonghuashunProvider = new TonghuashunProvider();
