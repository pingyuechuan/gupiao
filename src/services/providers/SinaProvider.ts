import type { Kline, KlinePeriod, Quote, RankItem, Sector, StockInfo, TimeSharePoint } from '@/types';
import { parseSecid, prefixToMarket } from '@/utils/format';
import { toNumber, str, http } from '@/services/http';
import { eastmoneyProvider } from './EastMoneyProvider';
import type { IDataProvider, RankType } from './types';

function marketLetter(prefix: string): string {
  return prefixToMarket(prefix) === 'sz' ? 'sz' : 'sh';
}

export class SinaProvider implements IDataProvider {
  readonly name = 'sina' as const;

  async search(keyword: string): Promise<StockInfo[]> {
    return eastmoneyProvider.search(keyword);
  }

  async getQuote(secid: string): Promise<Quote> {
    const { marketPrefix, code } = parseSecid(secid);
    const symbol = `${marketLetter(marketPrefix)}${code}`;
    const res = await http.get(`/sina/list=${symbol}`, {
      responseType: 'text',
    });
    const raw = typeof res.data === 'string' ? res.data : '';
    const start = raw.indexOf('"');
    const end = raw.lastIndexOf('"');
    if (start < 0 || end <= start) throw new Error('Sina 行情解析失败');
    const parts = raw.slice(start + 1, end).split(',');
    const price = toNumber(parts[3]);
    const preClose = toNumber(parts[2]);
    const open = toNumber(parts[1]);
    const high = toNumber(parts[4]);
    const low = toNumber(parts[5]);
    const volume = toNumber(parts[8]) / 100; // 股 -> 手
    const amount = toNumber(parts[9]);
    const change = price - preClose;
    const changePercent = preClose ? (change / preClose) * 100 : 0;
    const amplitude = preClose ? ((high - low) / preClose) * 100 : 0;

    const bids = [0, 1, 2, 3, 4].map((i) => ({
      price: toNumber(parts[13 + i * 2]),
      volume: toNumber(parts[12 + i * 2]),
    }));
    const asks = [0, 1, 2, 3, 4].map((i) => ({
      price: toNumber(parts[23 + i * 2]),
      volume: toNumber(parts[22 + i * 2]),
    }));

    return {
      code,
      name: str(parts[0]),
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

  async getKline(_secid: string, _period: KlinePeriod): Promise<Kline[]> {
    return eastmoneyProvider.getKline(_secid, _period);
  }

  async getTimeShare(_secid: string): Promise<TimeSharePoint[]> {
    return eastmoneyProvider.getTimeShare(_secid);
  }

  async getRankList(_type: RankType, _limit?: number): Promise<RankItem[]> {
    return eastmoneyProvider.getRankList(_type, _limit);
  }

  async getSectors(): Promise<Sector[]> {
    return eastmoneyProvider.getSectors();
  }
}

export const sinaProvider = new SinaProvider();
