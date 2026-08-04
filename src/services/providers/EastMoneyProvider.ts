import type {
  DataProviderName,
  Kline,
  KlinePeriod,
  Market,
  Quote,
  RankItem,
  Sector,
  StockInfo,
  TimeSharePoint,
} from '@/types';
import { PERIOD_KLT } from '@/constants';
import { codeToSecid, parseSecid, prefixToMarket } from '@/utils/format';
import { toNumber, str, http } from '@/services/http';
import type { IDataProvider, RankType } from './types';

/** secid 前缀 -> 交易所 */
function secidToMarket(secid: string): Market {
  const { marketPrefix } = parseSecid(secid);
  return prefixToMarket(marketPrefix);
}

function klinePeriodParam(period: KlinePeriod): { klt: number } {
  // 日/周/月使用 klt 101/102/103，分时与分钟在别处处理
  if (period === 'day') return { klt: 101 };
  if (period === 'week') return { klt: 102 };
  if (period === 'month') return { klt: 103 };
  return { klt: PERIOD_KLT[period] };
}

export class EastMoneyProvider implements IDataProvider {
  readonly name: DataProviderName = 'eastmoney';

  async search(keyword: string): Promise<StockInfo[]> {
    const kw = keyword.trim();
    if (!kw) return [];
    try {
      const res = await http.get('/ems/api/suggest/get', {
        params: {
          input: kw,
          type: 14,
          token: 'D43BF722C8E5ADC0BEA5FED880B91F3D',
          count: 10,
        },
      });
      const root = res.data?.QuotationCodeTable;
      const rows: unknown[] = root?.Data ?? [];
      const list: StockInfo[] = [];
      for (const row of rows) {
        if (!Array.isArray(row)) continue;
        let code = '';
        let name = '';
        for (const cell of row) {
          const s = str(cell);
          if (/^\d{6}$/.test(s) && !code) code = s;
          if (/[一-龥]/.test(s) && !name) name = s;
        }
        if (code && name) {
          const { secid, market } = codeToSecid(code);
          list.push({ code, name, market, secid });
        }
      }
      return list;
    } catch {
      return [];
    }
  }

  async getQuote(secid: string): Promise<Quote> {
    const res = await http.get('/em/api/qt/stock/get', {
      params: {
        secid,
        fields:
          'f31,f32,f33,f34,f35,f36,f37,f38,f39,f40,f41,f42,f43,f44,f45,f46,f47,f48,f57,f58,f60,f86,f116,f162,f163',
        fltt: 2,
      },
    });
    const d = res.data?.data ?? {};
    const price = toNumber(d.f43);
    const preClose = toNumber(d.f60);
    const open = toNumber(d.f46);
    const high = toNumber(d.f44);
    const low = toNumber(d.f45);
    const volume = toNumber(d.f47);
    const amount = toNumber(d.f48);
    const change = price - preClose;
    const changePercent = preClose ? (change / preClose) * 100 : 0;
    const amplitude = preClose ? ((high - low) / preClose) * 100 : 0;

    const market = secidToMarket(secid);
    const bids = this.parseTicks(d, [41, 42, 43, 44, 45], [46, 47, 48, 49, 50]);
    const asks = this.parseTicks(d, [31, 32, 33, 34, 35], [36, 37, 38, 39, 40]);

    return {
      code: str(d.f57) || parseSecid(secid).code,
      name: str(d.f58),
      market,
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
      turnoverRate: toNumber(d.f162),
      pe: toNumber(d.f163),
      bids: bids.length ? bids : undefined,
      asks: asks.length ? asks : undefined,
      timestamp: Date.now(),
    };
  }

  private parseTicks(
    d: Record<string, unknown>,
    priceFields: number[],
    volFields: number[],
  ): NonNullable<Quote['bids']> {
    const ticks = priceFields.map((pf, i) => ({
      price: toNumber(d[`f${pf}`]),
      volume: toNumber(d[`f${volFields[i]}`]),
    }));
    if (ticks.every((t) => Number.isFinite(t.price) && t.price > 0)) return ticks;
    return [];
  }

  async getKline(secid: string, period: KlinePeriod): Promise<Kline[]> {
    const { klt } = klinePeriodParam(period);
    const res = await http.get('/emh/api/qt/stock/kline/get', {
      params: {
        secid,
        klt,
        fqt: 1,
        beg: 0,
        end: 20500101,
        fields1: 'f1,f2,f3,f4,f5,f6',
        fields2: 'f51,f52,f53,f54,f55,f56,f57,f58',
      },
    });
    const lines: string[] = res.data?.data?.klines ?? [];
    return lines.map((line) => {
      const p = line.split(',');
      return {
        date: p[0],
        open: toNumber(p[1]),
        close: toNumber(p[2]),
        high: toNumber(p[3]),
        low: toNumber(p[4]),
        volume: toNumber(p[5]),
        amount: toNumber(p[6]),
      };
    });
  }

  async getTimeShare(secid: string): Promise<TimeSharePoint[]> {
    const quote = await this.getQuote(secid);
    const res = await http.get('/emh/api/qt/stock/trends2/get', {
      params: {
        secid,
        iscr: 0,
        ndays: 1,
        forcect: 1,
        fields1: 'f1,f2,f3,f7',
        fields2: 'f51,f52,f53,f54,f55,f56,f57,f58',
      },
    });
    const trends: string[] = res.data?.data?.trends ?? [];
    const preClose = quote.preClose || 1;
    return trends.map((t) => {
      const p = t.split(',');
      const price = toNumber(p[2]);
      const avg = toNumber(p[7]);
      return {
        time: p[0],
        price,
        avgPrice: avg,
        volume: toNumber(p[5]),
        changePercent: ((price - preClose) / preClose) * 100,
      };
    });
  }

  async getRankList(type: RankType, limit = 50): Promise<RankItem[]> {
    const fidMap: Record<RankType, string> = {
      change: 'f3',
      amount: 'f7',
      turnover: 'f62',
      amplitude: 'f7',
    };
    const fid = fidMap[type];
    const res = await http.get('/em/api/qt/clist/get', {
      params: {
        pn: 1,
        pz: 200,
        po: 1,
        np: 1,
        fltt: 2,
        invt: 2,
        fid,
        fs: 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81',
        fields: 'f12,f13,f14,f2,f3,f4,f6,f7,f15,f16,f17,f18,f62',
      },
    });
    const diff: Record<string, unknown>[] = res.data?.data?.diff ?? [];
    const items: RankItem[] = diff.map((d) => {
      const price = toNumber(d.f2);
      const preClose = toNumber(d.f18);
      const changePercent = toNumber(d.f3);
      return {
        code: str(d.f12),
        name: str(d.f14),
        price,
        changePercent: Number.isFinite(changePercent)
          ? changePercent
          : preClose
            ? ((price - preClose) / preClose) * 100
            : 0,
        change: toNumber(d.f4),
        volume: toNumber(d.f6),
        amount: toNumber(d.f7),
        turnoverRate: toNumber(d.f62),
      };
    });
    items.sort((a, b) => b[metricKey(type)] - a[metricKey(type)]);
    return items.slice(0, limit);
  }

  async getSectors(): Promise<Sector[]> {
    const groups: { type: Sector['type']; fs: string }[] = [
      { type: 'industry', fs: 'm:90+t:2' },
      { type: 'concept', fs: 'm:90+t:3' },
      { type: 'region', fs: 'm:90+t:1' },
    ];
    const result: Sector[] = [];
    for (const g of groups) {
      try {
        const res = await http.get('/em/api/qt/clist/get', {
          params: {
            pn: 1,
            pz: 300,
            po: 1,
            np: 1,
            fltt: 2,
            invt: 2,
            fid: 'f3',
            fs: g.fs,
            fields: 'f12,f13,f14,f3,f62,f104',
          },
        });
        const diff: Record<string, unknown>[] = res.data?.data?.diff ?? [];
        for (const d of diff) {
          result.push({
            code: str(d.f12),
            name: str(d.f14),
            type: g.type,
            changePercent: toNumber(d.f3),
            leader: str(d.f104),
          });
        }
      } catch {
        /* 单个板块组失败不影响其他 */
      }
    }
    return result;
  }
}

function metricKey(type: RankType): 'changePercent' | 'amount' | 'turnoverRate' {
  if (type === 'amount') return 'amount';
  if (type === 'turnover') return 'turnoverRate';
  return 'changePercent';
}

export const eastmoneyProvider = new EastMoneyProvider();
