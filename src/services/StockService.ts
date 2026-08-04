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
import { DEFAULT_PROVIDER } from '@/constants';
import { getProvider, listProviders, tencentProvider, type IDataProvider, type RankType } from './providers';
import { fetchBatchQuotes, buildRankFromQuotes, buildSectorsFromQuotes, enrichQuoteFromTencent } from './batchQuote';
import { fetchTencentKline, fetchSinaMinuteKline, fetchTencentTimeShare } from './klineSources';
import { getRankUniverse, STATIC_SECTORS } from '@/constants/marketUniverse';

interface CacheEntry<T> {
  value: T;
  expire: number;
}

/**
 * 股票数据服务：统一调度数据源，对外屏蔽差异。
 * 业务逻辑只依赖此服务，切换数据源无需改动调用方。
 */
class StockService {
  private active: IDataProvider = getProvider(DEFAULT_PROVIDER);
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly ttl: Record<string, number> = {
    quote: 3000,
    kline: 60000,
    timeshare: 5000,
    rank: 10000,
    sectors: 60000,
    search: 60000,
  };

  /** 切换数据源 */
  setProvider(name: DataProviderName): void {
    this.active = getProvider(name);
    this.cache.clear();
  }

  getProviderName(): DataProviderName {
    return this.active.name;
  }

  listProviders(): DataProviderName[] {
    return listProviders();
  }

  private get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (entry && entry.expire > Date.now()) return entry.value as T;
    return undefined;
  }

  private set<T>(key: string, value: T, ttlMs: number): void {
    this.cache.set(key, { value, expire: Date.now() + ttlMs });
  }

  async search(keyword: string): Promise<StockInfo[]> {
    const key = `search:${keyword}`;
    const hit = this.get<StockInfo[]>(key);
    if (hit) return hit;
    const data = await this.active.search(keyword);
    this.set(key, data, this.ttl.search);
    return data;
  }

  async getQuote(secid: string): Promise<Quote> {
    const key = `quote:${secid}`;
    const hit = this.get<Quote>(key);
    if (hit) return hit;
    let data: Quote;
    try {
      data = await this.active.getQuote(secid);
    } catch {
      // 整源失败（如同花顺/东财偶发不可用）→ 回退到腾讯实时行情
      data = await tencentProvider.getQuote(secid);
    }
    // 当前数据源若未提供五档/换手率/成交额，用腾讯接口兜底补全
    data = await enrichQuoteFromTencent(secid, data);
    this.set(key, data, this.ttl.quote);
    return data;
  }

  async getQuotes(secids: string[]): Promise<Quote[]> {
    return Promise.all(secids.map((s) => this.getQuote(s).catch(() => null))).then((r) =>
      r.filter((x): x is Quote => x !== null),
    );
  }

  async getKline(secid: string, period: KlinePeriod): Promise<Kline[]> {
    const key = `kline:${secid}:${period}`;
    const hit = this.get<Kline[]>(key);
    if (hit) return hit;
    const isMinute = period.startsWith('min');
    // 分钟 K 线仅腾讯/新浪支持；日/周/月优先主源，失败再用腾讯前复权 K 线兜底
    const sources: Array<() => Promise<Kline[]>> = isMinute
      ? [
          () => fetchSinaMinuteKline(secid, period as 'min5' | 'min15' | 'min30' | 'min60'),
          () => this.active.getKline(secid, period),
        ]
      : [
          () => this.active.getKline(secid, period),
          () => fetchTencentKline(secid, period as 'day' | 'week' | 'month'),
        ];
    let data: Kline[] = [];
    for (const src of sources) {
      try {
        const d = await src();
        if (d && d.length) {
          data = d;
          break;
        }
      } catch {
        // 尝试下一个数据源
      }
    }
    this.set(key, data, this.ttl.kline);
    return data;
  }

  async getTimeShare(secid: string): Promise<TimeSharePoint[]> {
    const key = `ts:${secid}`;
    const hit = this.get<TimeSharePoint[]>(key);
    if (hit) return hit;
    let data: TimeSharePoint[] = [];
    try {
      data = await this.active.getTimeShare(secid);
    } catch {
      data = [];
    }
    if (!data.length) {
      try {
        data = await fetchTencentTimeShare(secid);
      } catch {
        data = [];
      }
    }
    this.set(key, data, this.ttl.timeshare);
    return data;
  }

  async getRankList(type: RankType, limit?: number): Promise<RankItem[]> {
    const key = `rank:${type}:${limit ?? 50}`;
    const hit = this.get<RankItem[]>(key);
    if (hit) return hit;
    let data: RankItem[] = [];
    try {
      data = await this.active.getRankList(type, limit);
    } catch {
      data = [];
    }
    // 主源为空或失败 → 用腾讯批量行情兜底
    if (!data.length) {
      try {
        const quotes = await fetchBatchQuotes(getRankUniverse());
        data = buildRankFromQuotes(quotes, type as 'change' | 'amount' | 'turnover' | 'amplitude', limit ?? 50);
      } catch {
        data = [];
      }
    }
    this.set(key, data, this.ttl.rank);
    return data;
  }

  async getSectors(): Promise<Sector[]> {
    const key = 'sectors';
    const hit = this.get<Sector[]>(key);
    if (hit) return hit;
    let data: Sector[] = [];
    try {
      data = await this.active.getSectors();
    } catch {
      data = [];
    }
    if (!data.length) {
      try {
        const codes = Array.from(new Set(STATIC_SECTORS.flatMap((s) => s.leaders)));
        const quotes = await fetchBatchQuotes(codes);
        data = buildSectorsFromQuotes(STATIC_SECTORS, quotes);
      } catch {
        data = [];
      }
    }
    this.set(key, data, this.ttl.sectors);
    return data;
  }
}

export const stockService = new StockService();
export type { IDataProvider };
