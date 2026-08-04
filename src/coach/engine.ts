import {
  getRecommendations,
  matchTheme,
  type RiskLevel,
  type InvestPeriod,
  type RecommendItem,
} from '@/ai/recommend';

export interface UserProfile {
  budget: number;
  risk: RiskLevel;
  period: InvestPeriod;
  holdings: { code: string; name: string; amount: number }[];
}

export interface CoachRecommend {
  code: string;
  name: string;
  price: number;
  score: number;
  signal: string;
  amount: number; // 建议投入金额
  percent: number; // 占总预算比例
  reasons: string[];
  riskNote: string;
}

export interface CoachReply {
  text: string;
  recommendations: CoachRecommend[];
  remaining: number; // 剩余待命资金
  parsed: { budget: number; risk: RiskLevel; period: InvestPeriod; theme: string | null };
}

function parseBudget(text: string): number | null {
  // 支持：5000 / 1万 / 2w / 5千 / 10000元 / 1.5万
  const m = text.match(/(\d+(?:\.\d+)?)\s*(万|w|千|k|亿|块|元|￥|\$)?/i);
  if (!m) return null;
  const num = parseFloat(m[1]);
  if (!Number.isFinite(num)) return null;
  const unit = (m[2] || '').toLowerCase();
  if (unit === '万' || unit === 'w') return Math.round(num * 10000);
  if (unit === '亿') return Math.round(num * 1e8);
  if (unit === '千' || unit === 'k') return Math.round(num * 1000);
  return Math.round(num);
}

function parseRisk(text: string): RiskLevel | null {
  if (/保守|低风险|谨慎/.test(text)) return '保守';
  if (/激进|高风险|进攻/.test(text)) return '激进';
  if (/稳健|平衡|中性/.test(text)) return '稳健';
  return null;
}

function parsePeriod(text: string): InvestPeriod | null {
  if (/超短|短线|做t|日内|几天/.test(text)) return '短线';
  if (/长线|长期|价值|配置|拿久/.test(text)) return '长线';
  if (/中线|波段|几周|几个月/.test(text)) return '中线';
  return null;
}

function riskNoteFor(item: RecommendItem, risk: RiskLevel): string {
  if (item.changePercent > 7) return '今天已经涨不少，建议分两笔、别一次买满。';
  if (item.score < 60) return '技术面一般，先小仓位试错，设好止损。';
  if (risk === '保守' && item.changePercent > 4) return '偏稳健，控制单笔仓位，回踩再加。';
  return '趋势健康，可按计划建仓。';
}

/**
 * 规则驱动的 AI 投资教练。
 * 理解：预算 / 风险偏好 / 持仓 / 周期 / 主题，给出可执行的建仓方案。
 */
export async function runCoach(message: string, profile: UserProfile): Promise<CoachReply> {
  const budget = parseBudget(message) ?? profile.budget;
  const risk = parseRisk(message) ?? profile.risk;
  const period = parsePeriod(message) ?? profile.period;
  let theme = matchTheme(message);
  if (/价值投资|低估值|低估/.test(message)) {
    theme = theme ?? 'dividend';
  }

  const picks = await getRecommendations({ limit: 8, theme, period, risk });

  // 空仓保护：没有合适标的时
  if (!picks.length) {
    return {
      text:
        '现在 samples 里没找到技术面合适、又没涨过头的标的。' +
        (theme ? '换个主题，或' : '') +
        '建议先观望，等回调再动手。',
      recommendations: [],
      remaining: budget,
      parsed: { budget, risk, period, theme },
    };
  }

  // 资金分配
  const remainingRatio = risk === '保守' ? 0.25 : risk === '激进' ? 0.05 : 0.15;
  const investable = budget * (1 - remainingRatio);
  const maxPicks = risk === '保守' ? 4 : risk === '激进' ? 5 : 6;
  const top = picks.slice(0, maxPicks);

  const totalScore = top.reduce((s, p) => s + Math.max(20, p.score), 0) || 1;
  const recommendations: CoachRecommend[] = top.map((p) => {
    const weight = Math.max(20, p.score) / totalScore;
    let amount = Math.round((investable * weight) / 100) * 100;
    amount = Math.max(0, Math.min(amount, budget));
    return {
      code: p.code,
      name: p.name,
      price: p.price,
      score: p.score,
      signal: p.signal,
      amount,
      percent: budget ? Math.round((amount / budget) * 100) : 0,
      reasons: p.reasons.slice(0, 3),
      riskNote: riskNoteFor(p, risk),
    };
  });

  const allocated = recommendations.reduce((s, r) => s + r.amount, 0);
  const remaining = Math.max(0, budget - allocated);

  const themeText = theme ? '（按你选的主题筛选）' : '';
  const text =
    `根据你${risk}的风格和「${period}」周期${themeText}，我帮你选了 ` +
    `**${recommendations.length} 只**标的，建议先投入约 ` +
    `**¥${(investable).toLocaleString()}**，剩下 **¥${remaining.toLocaleString()}** 等机会。` +
    `\n\n下面每只都给了投入金额和理由，点开可看「为什么」。`;

  return { text, recommendations, remaining, parsed: { budget, risk, period, theme } };
}
