import type { Quote, Sector } from '@/types';
import { formatAmount } from '@/utils/format';

export interface MarketDiagnosis {
  temperature: number; // 0-100
  temperatureLabel: string;
  profitStars: number; // 1-5
  profitLabel: string;
  upCount: number;
  downCount: number;
  flatCount: number;
  totalAmount: number; // 元
  totalAmountText: string;
  avgChange: number;
  suggestion: string; // 主建议
  suggestionStars: number; // 操作强度 1-5
  position: number; // 建议仓位 %
  oneLine: string;
  strongSectors: Sector[]; // 最强 TOP3
  weakSectors: Sector[]; // 最弱 BOTTOM3
  /** 资金方向（人话结论） */
  fundDirection: string;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/**
 * 基于样本池行情 + 板块数据，给出"今天该怎么办"的诊断。
 * 这是给小白看的结论，不是原始数据。
 */
export function computeMarketDiagnosis(quotes: Quote[], sectors: Sector[]): MarketDiagnosis {
  const valid = quotes.filter((q) => Number.isFinite(q.changePercent));
  const up = valid.filter((q) => q.changePercent > 0).length;
  const down = valid.filter((q) => q.changePercent < 0).length;
  const flat = valid.length - up - down;
  const total = valid.length || 1;

  const avgChange =
    valid.reduce((s, q) => s + q.changePercent, 0) / total;

  const totalAmount = valid.reduce((s, q) => s + (Number.isFinite(q.amount) ? q.amount : 0), 0);

  // 市场温度：基础50 + 涨跌家数差 + 平均涨幅
  const breadthBias = ((up - down) / total) * 22;
  const temp = clamp(Math.round(50 + avgChange * 3.2 + breadthBias), 0, 100);

  let temperatureLabel = '温和';
  if (temp >= 80) temperatureLabel = '过热';
  else if (temp >= 62) temperatureLabel = '活跃';
  else if (temp >= 42) temperatureLabel = '温和';
  else if (temp >= 25) temperatureLabel = '偏冷';
  else temperatureLabel = '冰点';

  // 赚钱效应（星星）
  const profitRatio = up / total;
  let profitStars = 3;
  if (profitRatio >= 0.75) profitStars = 5;
  else if (profitRatio >= 0.6) profitStars = 4;
  else if (profitRatio >= 0.45) profitStars = 3;
  else if (profitRatio >= 0.3) profitStars = 2;
  else profitStars = 1;

  let profitLabel = '一般';
  if (profitStars >= 5) profitLabel = '极好';
  else if (profitStars >= 4) profitLabel = '不错';
  else if (profitStars === 3) profitLabel = '一般';
  else if (profitStars === 2) profitLabel = '偏差';
  else profitLabel = '很差';

  // 操作建议 + 仓位
  let suggestion = '可以逢低关注';
  let suggestionStars = 3;
  let position = 40;
  if (temp >= 78 && avgChange > 1.5) {
    suggestion = '不建议追高';
    suggestionStars = 2;
    position = 30;
  } else if (temp >= 60) {
    suggestion = '可以低吸';
    suggestionStars = 4;
    position = 50;
  } else if (temp >= 42) {
    suggestion = '可以逢低关注';
    suggestionStars = 3;
    position = 40;
  } else if (temp >= 25) {
    suggestion = '谨慎观望';
    suggestionStars = 2;
    position = 25;
  } else {
    suggestion = '控制仓位，等企稳';
    suggestionStars = 1;
    position = 15;
  }

  const upSectors = [...sectors].sort((a, b) => b.changePercent - a.changePercent).filter((s) => s.changePercent > 0);
  const downSectors = [...sectors].sort((a, b) => a.changePercent - b.changePercent).filter((s) => s.changePercent < 0);
  const strongSectors = upSectors.slice(0, 3);
  const weakSectors = downSectors.slice(0, 3);

  const oneLine =
    temp >= 60
      ? `今天属于${avgChange > 1 ? '放量' : '温和'}上涨行情，可积极一些。`
      : temp >= 42
        ? `今天市场震荡偏暖，精选个股为主。`
        : `今天市场偏弱，多看少动更安全。`;

  const fundDirection =
    strongSectors.length > 0
      ? `资金主要流向${strongSectors.map((s) => s.name).join('、')}等板块`
      : totalAmount > 4e11
        ? '全市场成交活跃，资金整体偏流入'
        : '资金观望为主，没有明显方向';

  return {
    temperature: temp,
    temperatureLabel,
    profitStars,
    profitLabel,
    upCount: up,
    downCount: down,
    flatCount: flat,
    totalAmount,
    totalAmountText: formatAmount(totalAmount),
    avgChange: +avgChange.toFixed(2),
    suggestion,
    suggestionStars,
    position,
    oneLine,
    strongSectors,
    weakSectors,
    fundDirection,
  };
}
