import type { Market } from '@/types';
import { COLORS } from '@/constants';

/** 保留两位小数（去掉多余0） */
export function formatNum(value: number, decimals = 2): string {
  if (!isFinite(value)) return '--';
  return value.toFixed(decimals);
}

/** 带正负号的百分比 */
export function formatPercent(value: number, decimals = 2): string {
  if (!isFinite(value)) return '--';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/** 大额数字（元）转 亿/万 */
export function formatAmount(value: number): string {
  if (!isFinite(value)) return '--';
  if (value >= 1e8) return `${(value / 1e8).toFixed(2)}亿`;
  if (value >= 1e4) return `${(value / 1e4).toFixed(2)}万`;
  return value.toFixed(0);
}

/** 成交量（手）转 万手 */
export function formatVolume(value: number): string {
  if (!isFinite(value)) return '--';
  if (value >= 1e4) return `${(value / 1e4).toFixed(2)}万手`;
  return `${value.toFixed(0)}手`;
}

/** 市值（元）转 亿 */
export function formatCap(value: number): string {
  if (!isFinite(value) || value <= 0) return '--';
  return `${(value / 1e8).toFixed(2)}亿`;
}

/** 根据涨跌返回颜色 */
export function changeColor(changePercent: number): string {
  if (changePercent > 0) return COLORS.up;
  if (changePercent < 0) return COLORS.down;
  return COLORS.text;
}

/** 由 secid（如 1.600000）拆分交易所前缀与代码 */
export function parseSecid(secid: string): { marketPrefix: string; code: string } {
  const [prefix, code] = secid.split('.');
  return { marketPrefix: prefix ?? '', code: code ?? secid };
}

/** 把市场前缀映射为 Market 类型 */
export function prefixToMarket(prefix: string): Market {
  switch (prefix) {
    case '0':
    case '3':
      return 'sz';
    case '8':
    case '4':
      return 'bj';
    case '1':
    case '6':
    default:
      return 'sh';
  }
}

/** 由6位代码推断市场与 secid（支持 600036 / sh600036 / 1.600036 / 0.000001 等格式） */
export function codeToSecid(code: string): { market: Market; secid: string; marketPrefix: string } {
  // 先去掉 sh/sz/bj 前缀
  const c = code.replace(/^(sh|sz|bj)/i, '');
  // 如果已经是 secid 格式（如 1.600036 / 0.000001），直接解析
  if (/^[10]\.\d{6}$/.test(c)) {
    const prefix = c.startsWith('0') ? '0' : '1';
    return { market: prefixToMarket(prefix), secid: c, marketPrefix: prefix };
  }
  let market: Market = 'sh';
  let prefix = '1';
  if (/^(60|68|9)/.test(c)) {
    market = 'sh';
    prefix = '1';
  } else if (/^(00|30|02|03)/.test(c)) {
    market = 'sz';
    prefix = '0';
  } else if (/^(8|4|92)/.test(c)) {
    market = 'bj';
    prefix = '0';
  }
  return { market, secid: `${prefix}.${c}`, marketPrefix: prefix };
}

/** 由6位代码推断市场与 secid（字符串代码带 sh/sz 前缀亦可） */
export function toSecid(raw: string): string {
  const c = raw.replace(/^(sh|sz|bj)\.?/i, '');
  if (/^(60|68|9)/.test(c)) return `1.${c}`;
  if (/^(00|30|02|03)/.test(c)) return `0.${c}`;
  if (/^(8|4|92)/.test(c)) return `0.${c}`;
  return `1.${c}`;
}

/** 补全东财 secid 用于榜单批量查询的编码 */
export function normalizeCode(raw: string): string {
  return raw.replace(/^(sh|sz|bj)\.?/i, '');
}

/** 限价显示：保留2位，不足补0 */
export function priceString(value: number): string {
  return formatNum(value, 2);
}
