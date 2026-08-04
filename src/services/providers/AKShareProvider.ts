import axios, { type AxiosInstance } from 'axios';
import type {
  DataProviderName,
  Kline,
  KlinePeriod,
  Quote,
  RankItem,
  Sector,
  StockInfo,
  TimeSharePoint,
} from '@/types';
import { AKSHARE_BASE_URL } from '@/constants';
import { prefixToMarket } from '@/utils/format';
import { toNumber, str } from '@/services/http';
import type { IDataProvider, RankType } from './types';

/**
 * AKShare 数据源：需自行部署 AKShare 后端网关（参见 README）。
 * 约定接口（可在后端自定义，只要返回下列字段即可）：
 *   GET /api/search?q=keyword  -> [{code, name}]
 *   GET /api/quote?code=xxx     -> 东方财富式字段或映射字段
 *   GET /api/kline?code=xxx&period=day -> [{date,open,close,high,low,volume,amount}]
 *   GET /api/timeshare?code=xxx -> [{time,price,avgPrice,volume,changePercent}]
 *   GET /api/rank?type=change   -> [{code,name,price,changePercent,change,volume,amount,turnoverRate}]
 *   GET /api/sectors            -> [{code,name,type,changePercent,leader}]
 */
export class AKShareProvider implements IDataProvider {
  readonly name: DataProviderName = 'akshare';
  private client: AxiosInstance;

  constructor(baseUrl: string = AKSHARE_BASE_URL) {
    this.client = axios.create({ baseURL: baseUrl, timeout: 15000 });
  }

  async search(keyword: string): Promise<StockInfo[]> {
    const res = await this.client.get('/api/search', { params: { q: keyword } });
    const rows: { code: string; name: string }[] = res.data ?? [];
    return rows.map((r) => {
      const { secid, market } = normalize(r.code);
      return { code: r.code, name: r.name, market, secid };
    });
  }

  async getQuote(secid: string): Promise<Quote> {
    const res = await this.client.get('/api/quote', { params: { code: toCode(secid) } });
    const d = res.data ?? {};
    const price = toNumber(d.price ?? d.f43);
    const preClose = toNumber(d.preClose ?? d.f60);
    const open = toNumber(d.open ?? d.f44);
    const high = toNumber(d.high ?? d.f45);
    const low = toNumber(d.low ?? d.f46);
    const volume = toNumber(d.volume ?? d.f47);
    const amount = toNumber(d.amount ?? d.f48);
    const change = price - preClose;
    const changePercent = preClose ? (change / preClose) * 100 : toNumber(d.changePercent);
    return {
      code: toCode(secid),
      name: str(d.name ?? d.f58),
      market: prefixToMarket(secid.split('.')[0] ?? '1'),
      price,
      preClose,
      open,
      high,
      low,
      volume,
      amount,
      amplitude: preClose ? ((high - low) / preClose) * 100 : 0,
      changePercent,
      change,
      turnoverRate: toNumber(d.turnoverRate ?? d.f162),
      bids: d.bids,
      asks: d.asks,
      timestamp: Date.now(),
    };
  }

  async getKline(secid: string, period: KlinePeriod): Promise<Kline[]> {
    const res = await this.client.get('/api/kline', {
      params: { code: toCode(secid), period },
    });
    const rows: Record<string, unknown>[] = res.data ?? [];
    return rows.map((r) => ({
      date: str(r.date),
      open: toNumber(r.open),
      close: toNumber(r.close),
      high: toNumber(r.high),
      low: toNumber(r.low),
      volume: toNumber(r.volume),
      amount: toNumber(r.amount),
    }));
  }

  async getTimeShare(secid: string): Promise<TimeSharePoint[]> {
    const res = await this.client.get('/api/timeshare', { params: { code: toCode(secid) } });
    const rows: Record<string, unknown>[] = res.data ?? [];
    return rows.map((r) => ({
      time: str(r.time),
      price: toNumber(r.price),
      avgPrice: toNumber(r.avgPrice),
      volume: toNumber(r.volume),
      changePercent: toNumber(r.changePercent),
    }));
  }

  async getRankList(type: RankType, limit = 50): Promise<RankItem[]> {
    const res = await this.client.get('/api/rank', { params: { type } });
    const rows: Record<string, unknown>[] = res.data ?? [];
    return rows.slice(0, limit).map((r) => ({
      code: str(r.code),
      name: str(r.name),
      price: toNumber(r.price),
      changePercent: toNumber(r.changePercent),
      change: toNumber(r.change),
      volume: toNumber(r.volume),
      amount: toNumber(r.amount),
      turnoverRate: toNumber(r.turnoverRate),
    }));
  }

  async getSectors(): Promise<Sector[]> {
    const res = await this.client.get('/api/sectors');
    const rows: Record<string, unknown>[] = res.data ?? [];
    return rows.map((r) => ({
      code: str(r.code),
      name: str(r.name),
      type: (r.type as Sector['type']) ?? 'concept',
      changePercent: toNumber(r.changePercent),
      leader: str(r.leader),
    }));
  }
}

function toCode(secid: string): string {
  return secid.includes('.') ? secid.split('.')[1] : secid;
}

function normalize(code: string): { secid: string; market: ReturnType<typeof prefixToMarket> } {
  const { secid, market } = (() => {
    if (code.includes('.')) {
      const [pre] = code.split('.');
      return { secid: code, market: prefixToMarket(pre) };
    }
    if (/^(60|68|9)/.test(code)) return { secid: `1.${code}`, market: prefixToMarket('1') as never };
    if (/^(00|30|02|03)/.test(code)) return { secid: `0.${code}`, market: prefixToMarket('0') as never };
    return { secid: `1.${code}`, market: prefixToMarket('1') as never };
  })();
  return { secid, market };
}

export const akShareProvider = new AKShareProvider();
