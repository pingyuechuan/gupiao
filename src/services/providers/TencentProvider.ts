import type { Kline, KlinePeriod, Quote, RankItem, Sector, StockInfo, TimeSharePoint } from '@/types';
import { parseSecid, prefixToMarket } from '@/utils/format';
import { toNumber, str, http } from '@/services/http';
import { eastmoneyProvider } from './EastMoneyProvider';
import { fetchBatchQuotes, buildRankFromQuotes, buildSectorsFromQuotes } from '../batchQuote';
import { getRankUniverse, STATIC_SECTORS } from '@/constants/marketUniverse';
import { fetchTencentKline, fetchSinaMinuteKline, fetchTencentTimeShare } from '../klineSources';
import type { IDataProvider, RankType } from './types';

function marketLetter(prefix: string): string {
  return prefixToMarket(prefix) === 'sz' ? 'sz' : 'sh';
}

export class TencentProvider implements IDataProvider {
  readonly name = 'tencent' as const;

  async search(keyword: string): Promise<StockInfo[]> {
    try {
      return await eastmoneyProvider.search(keyword);
    } catch {
      return [];
    }
  }

  async getQuote(secid: string): Promise<Quote> {
    const { marketPrefix, code } = parseSecid(secid);
    const symbol = `${marketLetter(marketPrefix)}${code}`;
    const res = await http.get(`/tc/q=${symbol}`, { responseType: 'text' });
    const raw = typeof res.data === 'string' ? res.data : '';
    const start = raw.indexOf('"');
    const end = raw.lastIndexOf('"');
    if (start < 0 || end <= start) throw new Error('腾讯行情解析失败');
    const p = raw.slice(start + 1, end).split('~');
    const price = toNumber(p[3]);
    const preClose = toNumber(p[4]);
    const open = toNumber(p[5]);
    const high = toNumber(p[33]);
    const low = toNumber(p[34]);
    const volume = toNumber(p[6]);
    const amount = NaN;
    const change = toNumber(p[31]);
    const changePercent = toNumber(p[32]);
    const amplitude = preClose ? ((high - low) / preClose) * 100 : 0;

    const bids = [0, 1, 2, 3, 4].map((i) => ({
      price: toNumber(p[9 + i * 2]),
      volume: toNumber(p[10 + i * 2]),
    }));
    const asks = [0, 1, 2, 3, 4].map((i) => ({
      price: toNumber(p[19 + i * 2]),
      volume: toNumber(p[20 + i * 2]),
    }));

    return {
      code,
      name: str(p[1]),
      market: prefixToMarket(marketPrefix),
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
      bids,
      asks,
      timestamp: Date.now(),
    };
  }

  async getKline(secid: string, period: KlinePeriod): Promise<Kline[]> {
    if (period === 'day' || period === 'week' || period === 'month') {
      return fetchTencentKline(secid, period);
    }
    return fetchSinaMinuteKline(secid, period as 'min5' | 'min15' | 'min30' | 'min60');
  }

  async getTimeShare(secid: string): Promise<TimeSharePoint[]> {
    return fetchTencentTimeShare(secid);
  }

  async getRankList(type: RankType, limit = 50): Promise<RankItem[]> {
    try {
      const quotes = await fetchBatchQuotes(getRankUniverse());
      return buildRankFromQuotes(quotes, type as 'change' | 'amount' | 'turnover' | 'amplitude', limit);
    } catch {
      return [];
    }
  }

  async getSectors(): Promise<Sector[]> {
    try {
      const codes = Array.from(new Set(STATIC_SECTORS.flatMap((s) => s.leaders)));
      const quotes = await fetchBatchQuotes(codes);
      return buildSectorsFromQuotes(STATIC_SECTORS, quotes);
    } catch {
      return [];
    }
  }
}

export const tencentProvider = new TencentProvider();
