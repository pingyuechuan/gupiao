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

export type RankType = 'change' | 'amount' | 'turnover' | 'amplitude';

/** 统一数据接口：所有数据源实现该接口，业务逻辑无需感知具体来源 */
export interface IDataProvider {
  readonly name: DataProviderName;
  /** 股票搜索（自动补全） */
  search(keyword: string): Promise<StockInfo[]>;
  /** 单只实时行情 */
  getQuote(secid: string): Promise<Quote>;
  /** 历史 K 线 */
  getKline(secid: string, period: KlinePeriod): Promise<Kline[]>;
  /** 当日分时 */
  getTimeShare(secid: string): Promise<TimeSharePoint[]>;
  /** 排行榜 */
  getRankList(type: RankType, limit?: number): Promise<RankItem[]>;
  /** 板块列表 */
  getSectors(): Promise<Sector[]>;
}
