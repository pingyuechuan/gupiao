import { http, toNumber, str } from '@/services/http';
import type { Quote, RankItem, Sector, TradeTick } from '@/types';
import { parseSecid, prefixToMarket } from '@/utils/format';

/** 将 secid 转为腾讯/新浪批量接口用的 symbol（sh600519 / sz000001） */
export function secidToSymbol(secid: string): string {
  const { marketPrefix, code } = parseSecid(secid);
  const market = prefixToMarket(marketPrefix) === 'sz' ? 'sz' : 'sh';
  return `${market}${code}`;
}

/** 解析单条腾讯行情字符串（v_sh601728="..."） */
function parseTencentQuoteLine(symbol: string, raw: string): Quote | null {
  const start = raw.indexOf('"');
  const end = raw.lastIndexOf('"');
  if (start < 0 || end <= start) return null;
  const p = raw.slice(start + 1, end).split('~');
  if (p.length < 35) return null;

  const code = symbol.replace(/^(sh|sz)/, '');
  const market = symbol.startsWith('sz') ? 'sz' : 'sh';
  const price = toNumber(p[3]);
  const preClose = toNumber(p[4]);
  const open = toNumber(p[5]);
  const high = toNumber(p[33]);
  const low = toNumber(p[34]);
  const volume = toNumber(p[6]);
  const change = toNumber(p[31]);
  const changePercent = toNumber(p[32]);

  // 成交额：优先取 p[37]（万）* 10000，否则从 p[35] 的 price/vol/amount 解析
  let amount = toNumber(p[37]) * 10000;
  if (!Number.isFinite(amount) || amount <= 0) {
    const segments = p[35]?.split('/');
    amount = segments && segments.length >= 3 ? toNumber(segments[2]) : NaN;
  }

  // 换手率 p[38]
  const turnoverRate = toNumber(p[38]);

  // 五档盘口：买1~5(p[9..18])，卖1~5(p[19..28])
  const bids: TradeTick[] = [];
  const asks: TradeTick[] = [];
  for (let i = 0; i < 5; i++) {
    bids.push({ price: toNumber(p[9 + i * 2]), volume: toNumber(p[10 + i * 2]) });
    asks.push({ price: toNumber(p[19 + i * 2]), volume: toNumber(p[20 + i * 2]) });
  }

  return {
    code,
    name: str(p[1]) || code,
    market,
    price,
    preClose,
    open,
    high,
    low,
    volume,
    amount,
    change,
    changePercent,
    amplitude: preClose ? ((high - low) / preClose) * 100 : 0,
    turnoverRate,
    pe: NaN,
    bids,
    asks,
    timestamp: Date.now(),
  };
}

/**
 * 批量获取行情（腾讯接口）。
 * 当当前数据源无法提供排行榜/板块时，用此接口兜底。
 */
export async function fetchBatchQuotes(secids: string[]): Promise<Quote[]> {
  const symbols = secids.map(secidToSymbol);
  if (!symbols.length) return [];

  // 腾讯单次建议不超过 300 只，这里切片保险
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += 300) {
    chunks.push(symbols.slice(i, i + 300));
  }

  const results: Quote[] = [];
  for (const chunk of chunks) {
    try {
      const res = await http.get(`/tc/q=${chunk.join(',')}`, { responseType: 'text' });
      const text = typeof res.data === 'string' ? res.data : '';
      const lines = text.split(';').filter((s) => s.includes('="'));
      for (const line of lines) {
        const eq = line.indexOf('=');
        if (eq < 0) continue;
        const symbol = line
          .slice(0, eq)
          .trim()
          .replace(/^v_/, '');
        const q = parseTencentQuoteLine(symbol, line);
        if (q) results.push(q);
      }
    } catch {
      // 整批失败则跳过
    }
  }
  return results;
}

/**
 * 用腾讯接口补充单股缺失字段（五档、换手率、成交额等）。
 * 当当前数据源（如 同花顺）不提供这些字段时作为兜底。
 */
export async function enrichQuoteFromTencent(secid: string, quote: Quote): Promise<Quote> {
  try {
    const symbol = secidToSymbol(secid);
    const res = await http.get(`/tc/q=${symbol}`, { responseType: 'text' });
    const text = typeof res.data === 'string' ? res.data : '';
    const line = text.split(';').find((s) => s.includes('="'));
    if (!line) return quote;

    const enriched = parseTencentQuoteLine(symbol, line);
    if (!enriched) return quote;

    // 补充缺失或无效字段；name 也用腾讯校正（同花顺对指数代码可能返回错误名称，如 000001→平安银行）
    const hasValidBids = (quote.bids?.length ?? 0) > 0 && quote.bids!.some((b) => b.price > 0 && b.volume > 0);
    const hasValidAsks = (quote.asks?.length ?? 0) > 0 && quote.asks!.some((a) => a.price > 0 && a.volume > 0);

    return {
      ...quote,
      name: enriched.name || quote.name,
      bids: hasValidBids ? quote.bids : enriched.bids,
      asks: hasValidAsks ? quote.asks : enriched.asks,
      amount: Number.isFinite(quote.amount) && quote.amount > 0 ? quote.amount : enriched.amount,
      turnoverRate: Number.isFinite(quote.turnoverRate) ? quote.turnoverRate : enriched.turnoverRate,
      volume: Number.isFinite(quote.volume) && quote.volume > 0 ? quote.volume : enriched.volume,
    };
  } catch {
    return quote;
  }
}

/**
 * 排行榜兜底：取一批股票批量行情，按指定指标排序。
 * 返回的字段与 RankItem 对齐。
 */
export function buildRankFromQuotes(quotes: Quote[], type: 'change' | 'amount' | 'turnover' | 'amplitude', limit = 50): RankItem[] {
  const items: RankItem[] = quotes.map((q) => ({
    code: q.code,
    name: q.name,
    price: q.price,
    changePercent: q.changePercent,
    change: q.change,
    volume: q.volume,
    amount: q.amount,
    turnoverRate: q.turnoverRate,
    amplitude: q.amplitude,
  }));

  const key =
    type === 'amount' ? 'amount' : type === 'turnover' ? 'turnoverRate' : type === 'amplitude' ? 'amplitude' : 'changePercent';
  items.sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0));
  return items.slice(0, limit);
}

/**
 * 板块兜底：用静态板块代表股计算板块平均涨跌幅。
 * 对每只代表股取 batch quote，按板块聚合平均。
 */
export function buildSectorsFromQuotes(
  sectors: { code: string; name: string; type: Sector['type']; leaders: string[] }[],
  quotes: Quote[],
): Sector[] {
  const quoteMap = new Map(quotes.map((q) => [q.code, q]));
  return sectors
    .map((s) => {
      // leaders 存的是 secid(1.600036)，quoteMap 的 key 是 6 位代码
      const leaderCodes = s.leaders.map((secid) => secid.split('.')[1] ?? secid);
      const vals = leaderCodes
        .map((code) => quoteMap.get(code)?.changePercent)
        .filter((v): v is number => Number.isFinite(v));
      const changePercent = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      // 领涨股：代表股里涨幅最大的那只
      const leaderQuote = leaderCodes
        .map((code) => quoteMap.get(code))
        .filter((q): q is Quote => !!q && Number.isFinite(q.changePercent))
        .sort((a, b) => b.changePercent - a.changePercent)[0];
      return {
        code: s.code,
        name: s.name,
        type: s.type,
        changePercent,
        leader: leaderQuote ? `${leaderQuote.name}(${leaderQuote.changePercent >= 0 ? '+' : ''}${leaderQuote.changePercent.toFixed(2)}%)` : s.name,
      };
    })
    .sort((a, b) => b.changePercent - a.changePercent);
}
